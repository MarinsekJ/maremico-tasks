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

    const whereClause: { groupId?: string | { in: string[] } } = {}

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
                user: {
                  select: {
                    id: true,
                    name: true,
                    surname: true,
                    username: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        activeWorkers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                username: true
              }
            }
          }
        },
        timePerUser: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate time from logs for each group task
    const groupTasksWithCalculatedTime = await Promise.all(
      groupTasks.map(async (groupTask) => {
        // Fetch logs for this group task
        const logs = await prisma.taskLog.findMany({
          where: {
            AND: [
              { taskType: 'GROUP_TASK' },
              { groupTaskId: groupTask.id }
            ]
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        // Calculate total time from logs
        let calculatedTimeSeconds = 0
        let currentSessionStart: Date | null = null

        for (const log of logs) {
          if (log.logType === 'STARTED_TIMER') {
            currentSessionStart = log.createdAt
          } else if ((log.logType === 'PAUSED_TIMER' || log.logType === 'COMPLETED_TASK') && currentSessionStart) {
            const sessionDuration = Math.floor((log.createdAt.getTime() - currentSessionStart.getTime()) / 1000)
            calculatedTimeSeconds += sessionDuration
            currentSessionStart = null
          }
        }

        // If there's an active session, add the current session time
        if (groupTask.status === 'IN_PROGRESS' && currentSessionStart) {
          const currentSessionDuration = Math.floor((new Date().getTime() - currentSessionStart.getTime()) / 1000)
          calculatedTimeSeconds += currentSessionDuration
        }

        return {
          ...groupTask,
          calculatedTimeSum: calculatedTimeSeconds
        }
      })
    )

    return NextResponse.json(groupTasksWithCalculatedTime)
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
        group: {
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    surname: true,
                    username: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        activeWorkers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                username: true
              }
            }
          }
        },
        timePerUser: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                username: true
              }
            }
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