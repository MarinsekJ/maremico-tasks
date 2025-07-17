'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, CheckCircle, Clock } from 'lucide-react'

interface GroupTaskTimerProps {
  taskId: string
  status: string
  timeSum: number
  isActive: boolean
  onStatusChange: (status: string) => void
}

export default function GroupTaskTimer({ taskId, status, timeSum, isActive, onStatusChange }: GroupTaskTimerProps) {
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
          className: 'bg-green-600 hover:bg-green-700'
        }
      case 'IN_PROGRESS':
        return {
          icon: Pause,
          label: 'Pause',
          action: 'pause',
          className: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'PAUSED':
        return {
          icon: Play,
          label: 'Resume',
          action: 'start',
          className: 'bg-blue-600 hover:bg-blue-700'
        }
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          label: 'Completed',
          action: null,
          className: 'bg-gray-400 cursor-not-allowed'
        }
      default:
        return {
          icon: Play,
          label: 'Start',
          action: 'start',
          className: 'bg-green-600 hover:bg-green-700'
        }
    }
  }

  const buttonConfig = getButtonConfig()

  return (
    <div className="flex flex-col items-center gap-2 min-w-[120px]">
      {/* Timer Display */}
      <div className="text-center">
        {isRunning && (
          <div className="text-xs text-blue-600 font-medium mb-1">
            <span className="hidden sm:inline">Active: </span>
            {formatTime(elapsedTime)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 w-full">
        {buttonConfig.action && (
          <button
            onClick={() => handleAction(buttonConfig.action!)}
            className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-white text-xs sm:text-sm rounded-lg transition-colors w-full ${buttonConfig.className}`}
          >
            <buttonConfig.icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{buttonConfig.label}</span>
          </button>
        )}

        {status !== 'COMPLETED' && (
          <button
            onClick={() => handleAction('complete')}
            className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg transition-colors w-full"
          >
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Complete</span>
          </button>
        )}
      </div>
    </div>
  )
} 