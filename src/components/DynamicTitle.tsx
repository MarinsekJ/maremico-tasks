'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActiveTask {
  id: string
  title: string
  type: 'REGULAR_TASK' | 'ADMIN_TASK' | 'GROUP_TASK'
  status: 'IN_PROGRESS'
  timeSum: number
  elapsedTime: number
  group?: {
    name: string
    color: string
  }
  assignedUser?: {
    name: string
    surname: string
  }
}

interface DynamicTitleProps {
  currentUserId?: string
}

export default function DynamicTitle({ currentUserId }: DynamicTitleProps) {
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null)


  useEffect(() => {
    fetchActiveTask()
  }, [currentUserId, fetchActiveTask])

  // Listen for task status changes
  useEffect(() => {
    const handleTaskStatusChange = () => {
      fetchActiveTask()
    }

    window.addEventListener('taskStatusChanged', handleTaskStatusChange)
    return () => window.removeEventListener('taskStatusChanged', handleTaskStatusChange)
  }, [fetchActiveTask])

  const fetchActiveTask = useCallback(async () => {
    if (!currentUserId) {
      setActiveTask(null)
      return
    }

    try {
      // Fetch regular tasks
      const regularTasksResponse = await fetch('/api/tasks')
      const regularTasks = await regularTasksResponse.json()
      
      // Find running regular task for current user
      const runningRegularTask = regularTasks.find((task: { assignedUser?: { id: string }; status: string }) => 
        task.assignedUser?.id === currentUserId && task.status === 'IN_PROGRESS'
      )

      if (runningRegularTask) {
        setActiveTask({
          id: runningRegularTask.id,
          title: runningRegularTask.title,
          type: runningRegularTask.type,
          status: runningRegularTask.status,
          timeSum: runningRegularTask.timeSum,
          elapsedTime: 0,
          assignedUser: runningRegularTask.assignedUser
        })
        return
      }

      // Fetch group tasks
      const groupTasksResponse = await fetch('/api/group-tasks')
      const groupTasks = await groupTasksResponse.json()
      
      // Find running group task where user is a member
      const runningGroupTask = groupTasks.find((task: { 
        status: string; 
        group?: { 
          users?: Array<{ userId: string }> 
        } 
      }) => {
        const isRunning = task.status === 'IN_PROGRESS'
        const isMember = task.group?.users?.some((userGroup) => userGroup.userId === currentUserId)
        return isRunning && isMember
      })

      if (runningGroupTask) {
        setActiveTask({
          id: runningGroupTask.id,
          title: runningGroupTask.title,
          type: 'GROUP_TASK',
          status: runningGroupTask.status,
          timeSum: runningGroupTask.timeSum,
          elapsedTime: 0,
          group: runningGroupTask.group
        })
      } else {
        setActiveTask(null)
      }
    } catch (error) {
      console.error('Error fetching active task for title:', error)
      setActiveTask(null)
    }
  }, [currentUserId])

  // Update page title based on active task
  useEffect(() => {
    if (activeTask) {
      const baseTitle = 'TASK RUNNING: '
      const fullTitle = baseTitle + activeTask.title
      
      // Set the title
      document.title = fullTitle
      
      // Start sliding animation if title is long
      if (fullTitle.length > 30) {
        const slideTitle = () => {
          setTitlePosition(prev => {
            const newPos = prev - 1
            if (newPos < -(fullTitle.length - 30)) {
              return 0
            }
            return newPos
          })
        }
        
        const interval = setInterval(slideTitle, 200)
        return () => clearInterval(interval)
      } else {
        setTitlePosition(0)
      }
    } else {
      document.title = 'Maremico Task System'
      setTitlePosition(0)
    }
  }, [activeTask])

  // Timer effect for elapsed time (for title updates)
  useEffect(() => {
    if (!activeTask) return

    const interval = setInterval(() => {
      setActiveTask(prev => {
        if (!prev) return null
        return {
          ...prev,
          elapsedTime: prev.elapsedTime + 1
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTask])

  // This component doesn't render anything visible
  return null
} 