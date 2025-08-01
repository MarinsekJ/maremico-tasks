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
    const { id: taskId } = await params

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignedUser: true,
          creator: true
        }
      })

      if (!task) {
        throw new Error('Task not found')
      }

      // Check if user is assigned to this task - only assigned user can perform timer actions
      if (task.assignedUserId !== decoded.id) {
        throw new Error('Only the assigned user can perform timer actions on this task')
      }

      let updatedTask
      let logType: 'STARTED_TIMER' | 'PAUSED_TIMER' | 'COMPLETED_TASK' | 'UNCOMPLETED_TASK' | 'CHANGED_STATUS'

      switch (action) {
        case 'start':
          console.log(`[DEBUG] Starting task ${taskId} for user ${decoded.id}`)
          
          // Find and pause any other running task for this user
          const otherRunningTasks = await tx.task.findMany({
            where: {
              assignedUserId: decoded.id,
              status: 'IN_PROGRESS',
              id: { not: taskId }
            }
          })

          console.log(`[DEBUG] Found ${otherRunningTasks.length} other running tasks for user ${decoded.id}`)

          // Pause all other running tasks
          for (const runningTask of otherRunningTasks) {
            console.log(`[DEBUG] Pausing task ${runningTask.id} (${runningTask.title})`)
            await tx.task.update({
              where: { id: runningTask.id },
              data: { 
                status: 'PAUSED'
                // Don't add timeSum here - the elapsed time will be added when the user manually pauses the task
              }
            })

            // Log the pause action for other tasks
            try {
              await tx.taskLog.create({
                data: {
                  userId: decoded.id,
                  taskId: runningTask.id,
                  taskType: runningTask.type,
                  logType: 'PAUSED_TIMER',
                  details: `Auto-paused when starting task: ${task.title}`
                }
              })
            } catch (logError) {
              console.warn('Failed to create task log for auto-pause:', logError)
            }
          }

          // Also pause any running group tasks for this user
          const userGroups = await tx.userGroup.findMany({
            where: { userId: decoded.id },
            select: { groupId: true }
          })
          const userGroupIds = userGroups.map(ug => ug.groupId)

          console.log(`[DEBUG] User ${decoded.id} is in groups: ${userGroupIds.join(', ')}`)

          if (userGroupIds.length > 0) {
            const runningGroupTasks = await tx.groupTask.findMany({
              where: {
                status: 'IN_PROGRESS',
                groupId: { in: userGroupIds }
              }
            })

            console.log(`[DEBUG] Found ${runningGroupTasks.length} running group tasks for user ${decoded.id}`)

            // Pause all running group tasks
            for (const runningGroupTask of runningGroupTasks) {
              console.log(`[DEBUG] Pausing group task ${runningGroupTask.id} (${runningGroupTask.title})`)
              await tx.groupTask.update({
                where: { id: runningGroupTask.id },
                data: { 
                  status: 'PAUSED'
                  // Don't add timeSum here - the elapsed time will be added when the user manually pauses the task
                }
              })

              // Log the pause action for group tasks
              try {
                await tx.taskLog.create({
                  data: {
                    userId: decoded.id,
                    groupTaskId: runningGroupTask.id,
                    taskType: 'GROUP_TASK',
                    logType: 'PAUSED_TIMER',
                    details: `Auto-paused when starting regular task: ${task.title}`
                  }
                })
              } catch (logError) {
                console.warn('Failed to create task log for auto-pause:', logError)
              }
            }
          }

          console.log(`[DEBUG] Starting task ${taskId} with status IN_PROGRESS`)
          // Start the current task
          updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { status: 'IN_PROGRESS' },
            include: {
              assignedUser: true,
              creator: true
            }
          })
          logType = 'STARTED_TIMER'
          break

        case 'pause':
          console.log(`[DEBUG] Pausing task ${taskId}: current timeSum=${task.timeSum}, timeSpent=${timeSpent}, new timeSum=${task.timeSum + (timeSpent || 0)}`)
          updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { 
              status: 'PAUSED',
              timeSum: task.timeSum + (timeSpent || 0)
            },
            include: {
              assignedUser: true,
              creator: true
            }
          })
          console.log(`[DEBUG] Task ${taskId} paused: updated timeSum=${updatedTask.timeSum}`)
          logType = 'PAUSED_TIMER'
          break

        case 'complete':
          console.log(`[DEBUG] Completing task ${taskId}: current timeSum=${task.timeSum}, timeSpent=${timeSpent}, new timeSum=${task.timeSum + (timeSpent || 0)}`)
          updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { 
              status: 'COMPLETED',
              timeSum: task.timeSum + (timeSpent || 0)
            },
            include: {
              assignedUser: true,
              creator: true
            }
          })
          console.log(`[DEBUG] Task ${taskId} completed: updated timeSum=${updatedTask.timeSum}`)
          logType = 'COMPLETED_TASK'
          break

        case 'uncomplete':
          updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { 
              status: 'WAITING'
            },
            include: {
              assignedUser: true,
              creator: true
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
            taskId: taskId,
            taskType: task.type,
            logType,
            details: `${action} task: ${task.title}`
          }
        })
      } catch (logError) {
        console.warn('Failed to create task log:', logError)
      }

      return updatedTask
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating task timer:', error)
    if (error instanceof Error) {
      if (error.message === 'Task not found') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      if (error.message.includes('Only the assigned user')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
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