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

    const { id: taskId } = await params

    // First check if the task exists and user has access to it
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Regular users can only view logs for tasks assigned to them
    if (decoded.userType === 'REGULAR_USER' && task.assignedUserId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch task logs - search by taskType first, then by taskId
    const logs = await prisma.taskLog.findMany({
      where: {
        AND: [
          { taskType: task.type },
          { taskId: taskId }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching task logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 