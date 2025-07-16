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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Regular users can only view tasks assigned to them
    if (decoded.userType === 'REGULAR_USER' && task.assignedUserId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Regular users can only update tasks assigned to them
    if (decoded.userType === 'REGULAR_USER' && task.assignedUserId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, description, deadline, status, assignedUserId } = await request.json()

    // Regular users can only assign tasks to themselves
    if (decoded.userType === 'REGULAR_USER') {
      if (assignedUserId && assignedUserId !== decoded.id) {
        return NextResponse.json(
          { error: 'Regular users can only assign tasks to themselves' },
          { status: 403 }
        )
      }
    }

    // Only update deadline if a valid new deadline is provided
    let processedDeadline = task.deadline
    if (deadline !== undefined && deadline !== null && deadline !== '') {
      const dateObj = new Date(deadline)
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid deadline date format' },
          { status: 400 }
        )
      }
      processedDeadline = dateObj
    }
    // If deadline is empty, null, or undefined, keep the existing deadline

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title || task.title,
        description: description !== undefined ? description : task.description,
        deadline: processedDeadline,
        status: status || task.status,
        assignedUserId: assignedUserId || task.assignedUserId
      },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    // Log task update
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: id,
          taskType: updatedTask.type,
          logType: 'CHANGED_STATUS',
          details: `Updated task: ${updatedTask.title}`
        }
      })
    } catch (logError) {
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
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

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only admins or the task creator can delete tasks
    if (decoded.userType !== 'ADMIN' && task.creatorId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.task.delete({
      where: { id }
    })

    // Log task deletion
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: id,
          taskType: task.type,
          logType: 'CHANGED_STATUS',
          details: `Deleted task: ${task.title}`
        }
      })
    } catch (logError) {
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 