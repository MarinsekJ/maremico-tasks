import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const groupTask = await prisma.groupTask.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            users: {
              include: {
                user: true
              }
            }
          }
        },
        timePerUser: {
          include: {
            user: true
          }
        }
      }
    })

    if (!groupTask) {
      return NextResponse.json({ error: 'Group task not found' }, { status: 404 })
    }

    // Check if user has access to this group task
    const userInGroup = groupTask.group.users.some(ug => ug.userId === decoded.id)
    if (decoded.userType === 'REGULAR_USER' && !userInGroup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(groupTask)
  } catch (error) {
    console.error('Error fetching group task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const groupTask = await prisma.groupTask.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            users: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!groupTask) {
      return NextResponse.json({ error: 'Group task not found' }, { status: 404 })
    }

    // Check if user has access to edit this group task
    const userInGroup = groupTask.group.users.some(ug => ug.userId === decoded.id)
    if (decoded.userType === 'REGULAR_USER' && !userInGroup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, description, deadline, status } = await request.json()

    // Only admins can change status
    let updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null
    }
    if (status !== undefined && decoded.userType === 'ADMIN') {
      updateData.status = status
    }

    const updatedGroupTask = await prisma.groupTask.update({
      where: { id },
      data: updateData,
      include: {
        group: {
          include: {
            users: {
              include: {
                user: true
              }
            }
          }
        },
        timePerUser: {
          include: {
            user: true
          }
        }
      }
    })

    // Log task update
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: null, // Group tasks don't have a taskId reference
          groupTaskId: id, // Store the group task ID
          taskType: 'GROUP_TASK',
          logType: 'CHANGED_STATUS',
          details: `Updated group task: ${updatedGroupTask.title}`
        }
      })
    } catch (logError) {
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json(updatedGroupTask)
  } catch (error) {
    console.error('Error updating group task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const groupTask = await prisma.groupTask.findUnique({
      where: { id },
      include: {
        group: true
      }
    })

    if (!groupTask) {
      return NextResponse.json({ error: 'Group task not found' }, { status: 404 })
    }

    // Only admins can delete group tasks
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.groupTask.delete({
      where: { id }
    })

    // Log task deletion
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: null, // Group tasks don't have a taskId reference
          groupTaskId: id, // Store the group task ID
          taskType: 'GROUP_TASK',
          logType: 'CHANGED_STATUS',
          details: `Deleted group task: ${groupTask.title}`
        }
      })
    } catch (logError) {
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json({ message: 'Group task deleted successfully' })
  } catch (error) {
    console.error('Error deleting group task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 