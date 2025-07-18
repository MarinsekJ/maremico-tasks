import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
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

    const { action, timeSpent } = await request.json()
    const { id: groupTaskId } = await params
    
    console.log(`[DEBUG] User ID from token: ${decoded.id}`)
    console.log(`[DEBUG] Group task ID: ${groupTaskId}`)

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const groupTask = await tx.groupTask.findUnique({
        where: { id: groupTaskId },
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
        throw new Error('Group task not found')
      }

      // Check if user can access this group task
      console.log(`[DEBUG] Checking group membership for user ${decoded.id} in group ${groupTask.group.id}`)
      console.log(`[DEBUG] Group users:`, groupTask.group.users.map(ug => ({ userId: ug.userId, userName: ug.user?.username || 'N/A' })))
      
      const userInGroup = groupTask.group.users.some(ug => ug.userId === decoded.id)
      console.log(`[DEBUG] User in group: ${userInGroup}`)
      
      if (!userInGroup) {
        console.log(`[DEBUG] User ${decoded.id} is not a member of group ${groupTask.group.id}`)
        throw new Error('Forbidden')
      }

      let updatedGroupTask
      let logType: 'STARTED_TIMER' | 'PAUSED_TIMER' | 'COMPLETED_TASK' | 'UNCOMPLETED_TASK' | 'CHANGED_STATUS'

      switch (action) {
        case 'start':
          console.log(`[DEBUG] Starting group task ${groupTaskId} for user ${decoded.id}`)
          
          // Find and pause any other running group task for this user
          const otherRunningGroupTasks = await tx.groupTask.findMany({
            where: {
              status: 'IN_PROGRESS',
              id: { not: groupTaskId },
              group: {
                users: {
                  some: {
                    userId: decoded.id
                  }
                }
              }
            }
          })

          console.log(`[DEBUG] Found ${otherRunningGroupTasks.length} other running group tasks for user ${decoded.id}`)

          // Pause all other running group tasks
          for (const runningGroupTask of otherRunningGroupTasks) {
            console.log(`[DEBUG] Pausing group task ${runningGroupTask.id} (${runningGroupTask.title})`)
            await tx.groupTask.update({
              where: { id: runningGroupTask.id },
              data: { 
                status: 'PAUSED',
                timeSum: runningGroupTask.timeSum + (timeSpent || 0)
              }
            })

            // Log the pause action for other group tasks
            try {
              await tx.taskLog.create({
                data: {
                  userId: decoded.id,
                  groupTaskId: runningGroupTask.id,
                  taskType: 'GROUP_TASK',
                  logType: 'PAUSED_TIMER',
                  details: `Auto-paused when starting group task: ${groupTask.title}`
                }
              })
            } catch (logError) {
              console.warn('Failed to create task log for auto-pause:', logError)
            }
          }

          // Also pause any running regular/admin tasks for this user
          const runningRegularTasks = await tx.task.findMany({
            where: {
              assignedUserId: decoded.id,
              status: 'IN_PROGRESS'
            }
          })

          console.log(`[DEBUG] Found ${runningRegularTasks.length} running regular tasks for user ${decoded.id}`)

          // Pause all running regular/admin tasks
          for (const runningTask of runningRegularTasks) {
            console.log(`[DEBUG] Pausing regular task ${runningTask.id} (${runningTask.title})`)
            await tx.task.update({
              where: { id: runningTask.id },
              data: { 
                status: 'PAUSED',
                timeSum: runningTask.timeSum + (timeSpent || 0)
              }
            })

            // Log the pause action for regular tasks
            try {
              await tx.taskLog.create({
                data: {
                  userId: decoded.id,
                  taskId: runningTask.id,
                  taskType: runningTask.type,
                  logType: 'PAUSED_TIMER',
                  details: `Auto-paused when starting group task: ${groupTask.title}`
                }
              })
            } catch (logError) {
              console.warn('Failed to create task log for auto-pause:', logError)
            }
          }

          console.log(`[DEBUG] Starting group task ${groupTaskId} with status IN_PROGRESS`)
          updatedGroupTask = await tx.groupTask.update({
            where: { id: groupTaskId },
            data: { status: 'IN_PROGRESS' },
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
          logType = 'STARTED_TIMER'
          break

        case 'pause':
          // Update or create time tracking for the user
          const existingTimeEntry = await tx.groupTaskTime.findUnique({
            where: {
              userId_groupTaskId: {
                userId: decoded.id,
                groupTaskId: groupTaskId
              }
            }
          })

          if (existingTimeEntry) {
            await tx.groupTaskTime.update({
              where: { id: existingTimeEntry.id },
              data: { timeSpent: existingTimeEntry.timeSpent + (timeSpent || 0) }
            })
          } else {
            await tx.groupTaskTime.create({
              data: {
                userId: decoded.id,
                groupTaskId: groupTaskId,
                timeSpent: timeSpent || 0
              }
            })
          }

          updatedGroupTask = await tx.groupTask.update({
            where: { id: groupTaskId },
            data: { 
              status: 'PAUSED',
              timeSum: groupTask.timeSum + (timeSpent || 0)
            },
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
          logType = 'PAUSED_TIMER'
          break

        case 'complete':
          // Update or create time tracking for the user
          const existingTimeEntryComplete = await tx.groupTaskTime.findUnique({
            where: {
              userId_groupTaskId: {
                userId: decoded.id,
                groupTaskId: groupTaskId
              }
            }
          })

          if (existingTimeEntryComplete) {
            await tx.groupTaskTime.update({
              where: { id: existingTimeEntryComplete.id },
              data: { timeSpent: existingTimeEntryComplete.timeSpent + (timeSpent || 0) }
            })
          } else {
            await tx.groupTaskTime.create({
              data: {
                userId: decoded.id,
                groupTaskId: groupTaskId,
                timeSpent: timeSpent || 0
              }
            })
          }

          updatedGroupTask = await tx.groupTask.update({
            where: { id: groupTaskId },
            data: { 
              status: 'COMPLETED',
              timeSum: groupTask.timeSum + (timeSpent || 0)
            },
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
          logType = 'COMPLETED_TASK'
          break

        case 'uncomplete':
          updatedGroupTask = await tx.groupTask.update({
            where: { id: groupTaskId },
            data: { 
              status: 'WAITING'
            },
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
          logType = 'UNCOMPLETED_TASK'
          break

        default:
          throw new Error('Invalid action')
      }

      // Log task action
      try {
        await tx.taskLog.create({
          data: {
            userId: decoded.id,
            taskId: null, // Group tasks don't have a taskId reference
            groupTaskId: groupTaskId, // Store the group task ID
            taskType: 'GROUP_TASK',
            logType,
            details: `${action} group task: ${groupTask.title}`
          }
        })
      } catch (logError) {
        console.warn('Failed to create task log:', logError)
      }

      return updatedGroupTask
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating group task timer:', error)
    if (error instanceof Error) {
      if (error.message === 'Group task not found') {
        return NextResponse.json({ error: 'Group task not found' }, { status: 404 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message === 'Invalid action') {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 