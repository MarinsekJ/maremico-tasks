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

    // Fetch all task logs for this task, ordered by creation time
    const logs = await prisma.taskLog.findMany({
      where: {
        AND: [
          { taskType: task.type },
          { taskId: taskId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Calculate total time from logs
    let totalTimeSeconds = 0
    let currentSessionStart: Date | null = null

    for (const log of logs) {
      if (log.logType === 'STARTED_TIMER') {
        // Start of a new session
        currentSessionStart = log.createdAt
      } else if ((log.logType === 'PAUSED_TIMER' || log.logType === 'COMPLETED_TASK') && currentSessionStart) {
        // End of a session - calculate the duration
        const sessionDuration = Math.floor((log.createdAt.getTime() - currentSessionStart.getTime()) / 1000)
        totalTimeSeconds += sessionDuration
        currentSessionStart = null
      }
    }

    // If there's an active session (task is currently running), add the current session time
    if (task.status === 'IN_PROGRESS' && currentSessionStart) {
      const currentSessionDuration = Math.floor((new Date().getTime() - currentSessionStart.getTime()) / 1000)
      totalTimeSeconds += currentSessionDuration
    }

    console.log(`[DEBUG] Calculated time for task ${taskId}: ${totalTimeSeconds}s from logs, stored timeSum: ${task.timeSum}s`)

    return NextResponse.json({
      calculatedTimeSeconds: totalTimeSeconds,
      storedTimeSum: task.timeSum,
      logs: logs.map(log => ({
        id: log.id,
        logType: log.logType,
        createdAt: log.createdAt,
        details: log.details
      }))
    })
  } catch (error) {
    console.error('Error calculating task time from logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 