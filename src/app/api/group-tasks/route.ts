import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    let whereClause: any = {}

    if (decoded.userType === 'REGULAR_USER') {
      // Get user's groups
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: decoded.id },
        select: { groupId: true }
      })
      const groupIds = userGroups.map(ug => ug.groupId)
      
      if (groupId) {
        // If a specific group is requested, check if user is a member of that group
        if (groupIds.includes(groupId)) {
          whereClause.groupId = groupId
        } else {
          return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 })
        }
      } else {
        // Show tasks from all user's groups
        whereClause.groupId = { in: groupIds }
      }
    } else if (groupId) {
      // Admin can access any group
      whereClause.groupId = groupId
    }

    const groupTasks = await prisma.groupTask.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(groupTasks)
  } catch (error) {
    console.error('Error fetching group tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create group tasks
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create group tasks' },
        { status: 403 }
      )
    }

    const { title, description, deadline, groupId } = await request.json()

    if (!title || !groupId) {
      return NextResponse.json(
        { error: 'Title and group are required' },
        { status: 400 }
      )
    }

    // Create the group task
    const groupTask = await prisma.groupTask.create({
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        groupId
      },
      include: {
        group: true,
        timePerUser: {
          include: {
            user: true
          }
        }
      }
    })

    // Create a log entry for group task creation
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: null, // Group tasks don't have a taskId reference
          groupTaskId: groupTask.id, // Store the group task ID
          taskType: 'GROUP_TASK',
          logType: 'CHANGED_STATUS',
          details: `Created group task: ${title}`
        }
      })
    } catch (logError) {
      // If logging fails, don't fail the entire operation
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json(groupTask, { status: 201 })
  } catch (error) {
    console.error('Error creating group task:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'A task with this title already exists in this group' },
          { status: 409 }
        )
      }
      if (error.message.includes('P2003')) {
        return NextResponse.json(
          { error: 'Invalid group ID' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 