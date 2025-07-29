'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, CheckCircle } from 'lucide-react'

interface GroupTaskTimerProps {
  taskId: string
  status: string
  isActive: boolean
  onStatusChange: (status: string) => void
  currentUserId?: string
  activeWorkers?: {
    id: string
    userId: string
    startedAt: string
    user: {
      id: string
      name: string
      surname: string
    }
  }[]
  timePerUser?: {
    user: {
      id: string
      name: string
      surname: string
    }
    timeSpent: number
  }[]
}

export default function GroupTaskTimer({ taskId, status, isActive, onStatusChange, currentUserId, activeWorkers, timePerUser }: GroupTaskTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Get current user's time contribution
  const currentUserTime = timePerUser?.find(tp => tp.user.id === currentUserId)?.timeSpent || 0
  
  // Check if current user is the active worker for this task
  const isCurrentUserActive = activeWorkers?.some(aw => aw.userId === currentUserId) || false
  
  // Get the active worker (if any)
  const activeWorker = activeWorkers?.[0]

  // Restore timer state from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`group-task-${taskId}-timer`)
    if (saved) {
      try {
        const { timeSpent, timestamp } = JSON.parse(saved)
        if (isActive && status === 'IN_PROGRESS' && isCurrentUserActive) {
          const now = Date.now()
          const additional = Math.floor((now - timestamp) / 1000)
          setElapsedTime(timeSpent + additional)
          startTimeRef.current = now - additional * 1000
        } else {
          setElapsedTime(timeSpent)
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, isCurrentUserActive])

  useEffect(() => {
    if (isActive && status === 'IN_PROGRESS' && isCurrentUserActive) {
      setIsRunning(true)
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedTime * 1000
      }
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
    } else {
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (!(isActive && status === 'IN_PROGRESS' && isCurrentUserActive)) {
        setElapsedTime(0)
        startTimeRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, status, isCurrentUserActive])

  // Additional effect to handle auto-pause scenarios
  useEffect(() => {
    // If status is not IN_PROGRESS, ensure timer is stopped
    if (status !== 'IN_PROGRESS' || !isCurrentUserActive) {
      console.log(`[DEBUG] GroupTaskTimer: Task ${taskId} status changed to ${status}, stopping timer`)
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setElapsedTime(0)
      // Clear timer from sessionStorage when not running
      sessionStorage.removeItem(`group-task-${taskId}-timer`)
    }
  }, [status, taskId, isCurrentUserActive])

  // Save timer state to session storage when component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && startTimeRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000)
        sessionStorage.setItem(`group-task-${taskId}-timer`, JSON.stringify({
          timeSpent,
          timestamp: Date.now()
        }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isRunning, taskId])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAction = async (action: string) => {
    try {
      const timeSpent = elapsedTime
      const response = await fetch(`/api/group-tasks/${taskId}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          timeSpent
        }),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        onStatusChange(updatedTask.status)
        
        // If starting a task, clear elapsed time since other tasks will be auto-paused
        if (action === 'start') {
          setElapsedTime(0)
        }
        
        // If pausing or completing, clear timer from sessionStorage
        if (action === 'pause' || action === 'complete') {
          sessionStorage.removeItem(`group-task-${taskId}-timer`)
        }
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error updating group task timer:', error)
    }
  }

  const getButtonConfig = () => {
    switch (status) {
      case 'WAITING':
        return {
          icon: Play,
          label: 'Start',
          action: 'start',
          className: 'bg-green-600 hover:bg-green-700 text-white'
        }
      case 'IN_PROGRESS':
        return {
          icon: Pause,
          label: 'Pause',
          action: 'pause',
          className: 'text-black'
        }
      case 'PAUSED':
        return {
          icon: Play,
          label: 'Resume',
          action: 'start',
          className: 'bg-black hover:bg-gray-800 text-white'
        }
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          label: 'Completed',
          action: null,
          className: 'bg-gray-400 cursor-not-allowed text-white'
        }
      default:
        return {
          icon: Play,
          label: 'Start',
          action: 'start',
          className: 'bg-green-600 hover:bg-green-700 text-white'
        }
    }
  }

  const buttonConfig = getButtonConfig()

  return (
    <div className="flex flex-col items-center gap-2 min-w-[120px]">
      {/* Timer Display */}
      <div className="text-center">
        {isRunning && isCurrentUserActive && (
          <div className="text-xs text-gray-600 font-medium mb-1">
            <span className="hidden sm:inline">Active: </span>
            {formatTime(elapsedTime)}
          </div>
        )}
        {/* Show who is currently working on this task */}
        {activeWorker && !isCurrentUserActive && (
          <div className="text-xs text-blue-600 font-medium mb-1">
            <span className="hidden sm:inline">Working: </span>
            {activeWorker.user.name}
          </div>
        )}
        {/* Show current user's contribution */}
        {currentUserTime > 0 && (
          <div className="text-xs text-green-600 font-medium mb-1">
            <span className="hidden sm:inline">Your time: </span>
            {formatTime(currentUserTime)}
          </div>
        )}
        {/* Show other users' contributions */}
        {timePerUser && timePerUser.length > 0 && (
          <div className="text-xs text-blue-600 font-medium mb-1">
            <span className="hidden sm:inline">Team: </span>
            {timePerUser.map(tp => `${tp.user.name} (${formatTime(tp.timeSpent)})`).join(', ')}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 w-full">
        {buttonConfig.action && (!activeWorker || isCurrentUserActive) && (
          <button
            onClick={() => handleAction(buttonConfig.action!)}
            className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors w-full ${buttonConfig.className}`}
            style={status === 'IN_PROGRESS' ? { backgroundColor: '#b9a057', color: 'black' } : {}}
          >
            <buttonConfig.icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{buttonConfig.label}</span>
          </button>
        )}

        {status !== 'COMPLETED' && (!activeWorker || isCurrentUserActive) && (
          <button
            onClick={() => handleAction('complete')}
            className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg transition-colors w-full"
          >
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Complete</span>
          </button>
        )}

        {activeWorker && !isCurrentUserActive && (
          <div className="text-xs text-gray-400 text-center mt-2">
            {activeWorker.user.name} is working on this task
          </div>
        )}

        {!currentUserId && (
          <div className="text-xs text-gray-400 text-center mt-2">
            Only group members can control the timer
          </div>
        )}
      </div>
    </div>
  )
} 