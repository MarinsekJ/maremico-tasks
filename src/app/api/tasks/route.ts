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
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    let whereClause: any = {}

    if (decoded.userType === 'REGULAR_USER') {
      // Regular users always see only their own tasks
      whereClause.assignedUserId = decoded.id
    } else if (userId) {
      // Admin users with specific userId filter
      whereClause.assignedUserId = userId
    } else {
      // Admin users without userId parameter - show only their own tasks by default
      whereClause.assignedUserId = decoded.id
    }

    if (type) {
      whereClause.type = type
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedUser: true,
        creator: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
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

    const { title, description, deadline, assignedUserId, type } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Regular users can only create tasks for themselves
    if (decoded.userType === 'REGULAR_USER') {
      if (assignedUserId && assignedUserId !== decoded.id) {
        return NextResponse.json(
          { error: 'Regular users can only assign tasks to themselves' },
          { status: 403 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        assignedUserId: assignedUserId || decoded.id,
        creatorId: decoded.id,
        type: type || 'REGULAR_TASK'
      },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    // Log task creation
    try {
      await prisma.taskLog.create({
        data: {
          userId: decoded.id,
          taskId: task.id,
          taskType: task.type,
          logType: 'CHANGED_STATUS',
          details: `Created task: ${task.title}`
        }
      })
    } catch (logError) {
      console.warn('Failed to create task log:', logError)
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 