'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pause, CheckCircle, Clock, Users, User } from 'lucide-react'

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

interface ActiveTaskCardProps {
  currentUserId?: string
}

export default function ActiveTaskCard({ currentUserId }: ActiveTaskCardProps) {
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActiveTask = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch current user info to check if they're an admin
      const userResponse = await fetch('/api/auth/me')
      const userData = await userResponse.json()
      const isAdmin = userData.userType === 'ADMIN'
      
      console.log(`[DEBUG] Current user:`, {
        id: currentUserId,
        userType: userData.userType,
        isAdmin
      })
      
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
        setLoading(false)
        return
      }

      // Fetch group tasks
      const groupTasksResponse = await fetch('/api/group-tasks')
      const groupTasks = await groupTasksResponse.json()
      
      // Find running group task where user is a member
      // Even admins can only interact with group tasks if they're members of the group
      const runningGroupTask = groupTasks.find((task: { 
        id: string; 
        title: string; 
        groupId: string; 
        status: string; 
        group?: { 
          users?: Array<{ 
            userId: string; 
            user?: { username: string } 
          }> 
        } 
      }) => {
        const isRunning = task.status === 'IN_PROGRESS'
        const isMember = task.group?.users?.some((userGroup) => userGroup.userId === currentUserId)
        console.log(`[DEBUG] Checking group task ${task.id} (${task.title}):`, {
          isRunning,
          isMember,
          currentUserId,
          groupUsers: task.group?.users?.map((u: { userId: string; user?: { username: string } }) => ({ userId: u.userId, username: u.user?.username }))
        })
        return isRunning && isMember
      })

      console.log(`[DEBUG] Found running group task:`, runningGroupTask ? {
        id: runningGroupTask.id,
        title: runningGroupTask.title,
        groupId: runningGroupTask.groupId,
        groupUsers: runningGroupTask.group?.users?.map((u: { userId: string; user?: { username: string } }) => ({ userId: u.userId, username: u.user?.username }))
      } : null)

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
      console.error('Error fetching active task:', error)
      setActiveTask(null)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

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

  const handlePause = async () => {
    if (!activeTask) return

    console.log(`[DEBUG] Pausing task:`, {
      taskId: activeTask.id,
      taskType: activeTask.type,
      currentUserId
    })

    try {
      const endpoint = activeTask.type === 'GROUP_TASK' 
        ? `/api/group-tasks/${activeTask.id}/timer`
        : `/api/tasks/${activeTask.id}/timer`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause',
          timeSpent: activeTask.elapsedTime
        }),
      })

      if (response.ok) {
        setActiveTask(null)
        // Trigger refresh on other pages
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error pausing task:', error)
    }
  }

  const handleComplete = async () => {
    if (!activeTask) return

    console.log(`[DEBUG] Completing task:`, {
      taskId: activeTask.id,
      taskType: activeTask.type,
      currentUserId
    })

    try {
      const endpoint = activeTask.type === 'GROUP_TASK' 
        ? `/api/group-tasks/${activeTask.id}/timer`
        : `/api/tasks/${activeTask.id}/timer`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          timeSpent: activeTask.elapsedTime
        }),
      })

      if (response.ok) {
        setActiveTask(null)
        // Trigger refresh on other pages
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer effect for elapsed time
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!activeTask) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <Clock className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No tasks currently active</p>
        </div>
      </div>
    )
  }

  const getTaskTypeIcon = () => {
    switch (activeTask.type) {
      case 'GROUP_TASK':
        return <Users className="h-4 w-4" />
      case 'ADMIN_TASK':
        return <User className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getTaskTypeLabel = () => {
    switch (activeTask.type) {
      case 'GROUP_TASK':
        return 'Group Task'
      case 'ADMIN_TASK':
        return 'Admin Task'
      default:
        return 'Regular Task'
    }
  }

  const getTaskTypeColor = () => {
    switch (activeTask.type) {
      case 'GROUP_TASK':
        return 'bg-blue-100 text-blue-700'
      case 'ADMIN_TASK':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-green-100 text-green-700'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-3">
        <div className="flex mb-2">
          {getTaskTypeIcon()}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor()}`}>
            {getTaskTypeLabel()}
          </span>
          {activeTask.group && (
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: activeTask.group.color }}
            >
              {activeTask.group.name}
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
          {activeTask.title}
        </h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
          <Clock className="h-4 w-4" />
          <span>Total: {formatTime(activeTask.timeSum + activeTask.elapsedTime)}</span>
        </div>
        <div className="text-xs text-blue-600 font-medium">
          Active: {formatTime(activeTask.elapsedTime)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handlePause}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-black text-sm rounded-lg transition-colors"
            style={{ backgroundColor: '#b9a057' }}
        >
          <Pause className="h-4 w-4" />
          <span className="hidden sm:inline">Pause</span>
        </button>
        <button
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Complete</span>
        </button>
      </div>
    </div>
  )
} 