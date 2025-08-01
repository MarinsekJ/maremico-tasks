'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, CheckCircle, Clock } from 'lucide-react'

interface TaskTimerProps {
  taskId: string
  status: string
  timeSum: number
  calculatedTimeSum?: number
  isActive: boolean
  onStatusChange: (status: string) => void
  assignedUserId?: string
  currentUserId?: string
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

export default function TaskTimer({ taskId, status, timeSum, calculatedTimeSum, isActive, onStatusChange, assignedUserId, currentUserId, onNotification }: TaskTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive && status === 'IN_PROGRESS') {
      setIsRunning(true)
      startTimeRef.current = Date.now()
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
      setElapsedTime(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, status])

  // Additional effect to handle status changes (auto-pause and manual pause)
  useEffect(() => {
    // If status is not IN_PROGRESS, ensure timer is stopped
    if (status !== 'IN_PROGRESS') {
      console.log(`[DEBUG] TaskTimer: Task ${taskId} status changed to ${status}, stopping timer`)
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // If this was an auto-pause (status changed but we still have elapsed time), immediately add it to total time
      if (elapsedTime > 0) {
        console.log(`[DEBUG] TaskTimer: Task ${taskId} auto-paused, immediately adding elapsed time ${elapsedTime} to total`)
        // Immediately send a pause request to add the elapsed time to the total
        fetch(`/api/tasks/${taskId}/timer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'pause',
            timeSpent: elapsedTime
          }),
        }).then(response => {
          if (response.ok) {
            console.log(`[DEBUG] TaskTimer: Successfully added elapsed time ${elapsedTime} to task ${taskId} total`)
            // Trigger refresh on other pages
            window.dispatchEvent(new CustomEvent('taskStatusChanged'))
          }
        }).catch(error => {
          console.error('Error adding elapsed time for auto-paused task:', error)
        })
      }
      
      // Reset elapsedTime when status changes
      setElapsedTime(0)
    }
  }, [status, taskId, elapsedTime])

  // Save timer state to session storage when component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && startTimeRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000)
        sessionStorage.setItem(`task-${taskId}-timer`, JSON.stringify({
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
      
      // For pause/complete actions, use current elapsed time (no need to check sessionStorage since auto-pause is handled immediately)
      
      console.log(`[DEBUG] TaskTimer ${taskId} ${action}: elapsedTime=${elapsedTime}, timeSpent=${timeSpent}`)
      const response = await fetch(`/api/tasks/${taskId}/timer`, {
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
        
        // Show success notification
        if (action === 'complete') {
          onNotification?.('Task completed!', 'success')
        } else if (action === 'start') {
          onNotification?.('Timer started', 'info')
        } else if (action === 'pause') {
          onNotification?.('Timer paused', 'info')
        }
        
        // Clear elapsed time when starting a new task or when manually pausing/completing
        if (action === 'start' || action === 'pause' || action === 'complete') {
          setElapsedTime(0)
        }
        
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      } else {
        const errorData = await response.json()
        if (errorData.error && errorData.error.includes('Only the assigned user')) {
          onNotification?.('Only the assigned user can control the timer for this task', 'error')
        } else {
          onNotification?.('Failed to update task timer', 'error')
        }
      }
    } catch (error) {
      console.error('Error updating task timer:', error)
    }
  }

  const getButtonConfig = () => {
    switch (status) {
      case 'WAITING':
        return {
          icon: Play,
          label: 'Start',
          action: 'start',
          className: 'bg-black hover:bg-gray-800 text-white'
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
          className: 'bg-black hover:bg-gray-800 text-white'
        }
    }
  }

  const buttonConfig = getButtonConfig()
  
  // Check if current user can control the timer
  const canControlTimer = assignedUserId && currentUserId && assignedUserId === currentUserId

  return (
    <div className="flex flex-col items-center gap-2 min-w-[120px]">
      {/* Timer Display */}
      <div className="text-center">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Total: </span>
          <span>{formatTime(calculatedTimeSum || timeSum)}</span>
        </div>
        {isActive && status === 'IN_PROGRESS' && (
          <div className="text-xs text-blue-600 font-medium mb-1">
            Active: {formatTime(elapsedTime)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 w-full">
        {canControlTimer && buttonConfig.action && (
          <button
            onClick={() => handleAction(buttonConfig.action!)}
            className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors w-full ${buttonConfig.className}`}
            style={status === 'IN_PROGRESS' ? { backgroundColor: '#b9a057', color: 'black' } : {}}
          >
            <buttonConfig.icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{buttonConfig.label}</span>
          </button>
        )}

        {canControlTimer && status !== 'COMPLETED' && (
          <button
            onClick={() => handleAction('complete')}
            className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg transition-colors w-full"
          >
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Complete</span>
          </button>
        )}

        {!canControlTimer && (
          <div className="text-xs text-gray-400 text-center mt-2">
            Only the assigned user can control the timer
          </div>
        )}
      </div>
    </div>
  )
} 