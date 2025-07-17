'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Play, Pause, CheckCircle, AlertCircle } from 'lucide-react'
import TaskTimer from './TaskTimer'
import { formatDate, isTaskOverdue, forceMobileNavigation } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  deadline?: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  timeSum: number
  type: 'ADMIN_TASK' | 'REGULAR_TASK'
  assignedUser?: {
    id: string
    name: string
    surname: string
  }
  creator: {
    name: string
    surname: string
  }
}

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  onTaskUpdate: () => void
  currentUserId?: string
}

export default function TaskList({ tasks, loading, onTaskUpdate, currentUserId }: TaskListProps) {
  const router = useRouter()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'status-waiting'
      case 'IN_PROGRESS':
        return 'status-in-progress'
      case 'COMPLETED':
        return 'status-completed'
      case 'PAUSED':
        return 'status-paused'
      default:
        return 'status-waiting'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WAITING':
        return <AlertCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'PAUSED':
        return <Pause className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleTaskClick = (taskId: string) => {
    // Force navigation on mobile
    const url = forceMobileNavigation(`/tasks/${taskId}`)
    router.push(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <AlertCircle className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No tasks found for today</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const overdue = isTaskOverdue(task.deadline)
        
        return (
          <div
            key={task.id}
            className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
              overdue 
                ? 'border-red-300 hover:border-red-400' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleTaskClick(task.id)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className={`text-lg font-medium ${
                      overdue ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    {overdue && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        OVERDUE
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status.toLowerCase().replace('_', ' ')}</span>
                    </span>
                    {task.type === 'ADMIN_TASK' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Admin Task
                      </span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span className={overdue ? 'text-red-600 font-medium' : ''}>
                        Due: {formatDate(task.deadline)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Time: {formatTime(task.timeSum)}</span>
                  </div>

                  {task.assignedUser && (
                    <span className="truncate">
                      Assigned to: {task.assignedUser.name} {task.assignedUser.surname}
                    </span>
                  )}

                  <span className="truncate">
                    Created by: {task.creator.name} {task.creator.surname}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div onClick={(e) => e.stopPropagation()}>
                  <TaskTimer
                    taskId={task.id}
                    status={task.status}
                    timeSum={task.timeSum}
                    isActive={activeTaskId === task.id}
                    onStatusChange={(newStatus) => {
                      if (newStatus === 'IN_PROGRESS') {
                        setActiveTaskId(task.id)
                      } else {
                        setActiveTaskId(null)
                      }
                      onTaskUpdate()
                    }}
                    assignedUserId={task.assignedUser?.id}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 