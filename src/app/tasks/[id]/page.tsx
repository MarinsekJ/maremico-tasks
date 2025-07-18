'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Calendar, User, Edit, Play, Trash2, Save, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { formatDate, formatDateTime, isTaskOverdue } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  deadline?: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  timeSum: number
  type: 'ADMIN_TASK' | 'REGULAR_TASK'
  assignedUser: {
    id: string
    name: string
    surname: string
    email: string
  }
  creator: {
    id: string
    name: string
    surname: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface TaskLog {
  id: string
  userId: string
  taskId: string
  taskType: 'ADMIN_TASK' | 'REGULAR_TASK' | 'GROUP_TASK'
  logType: 'STARTED_TIMER' | 'PAUSED_TIMER' | 'COMPLETED_TASK' | 'UNCOMPLETED_TASK' | 'CHANGED_STATUS' | 'TASK_CREATED' | 'START_TASK' | 'END_TASK'
  details: string
  createdAt: string
  user: {
    id: string
    name: string
    surname: string
    username: string
  }
}

interface User {
  id: string
  name: string
  surname: string
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [taskId, setTaskId] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedUserId: ''
  })

  useEffect(() => {
    const initializePage = async () => {
      if (!authLoading) {
        if (!isAuthenticated) {
          const { id } = await params
          router.push(`/login?redirectTo=${encodeURIComponent(`/tasks/${id}`)}`)
          return
        }
        const { id } = await params
        setTaskId(id)
        await fetchTask(id)
        await fetchTaskLogs(id)
        await fetchUsers()
      }
    }
    
    initializePage()
  }, [isAuthenticated, authLoading, router, params])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showDeleteModal])

  // Prevent scroll jumping on mobile
  useEffect(() => {
    const handleScroll = () => {
      // Prevent any automatic scroll restoration
      if (window.scrollY === 0 && document.body.scrollTop === 0) {
        // Don't do anything if we're already at the top
        return
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTask(data)
        setEditData({
          title: data.title,
          description: data.description || '',
          deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : '',
          assignedUserId: data.assignedUser?.id || ''
        })
      } else if (response.status === 404) {
        router.push('/tasks')
      }
    } catch (error) {
      console.error('Error fetching task:', error)
      router.push('/tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchTaskLogs = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}/logs`)
      if (response.ok) {
        const data = await response.json()
        setTaskLogs(data)
      }
    } catch (error) {
      console.error('Error fetching task logs:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'ADMIN_TASK' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }

  const getLogTypeDisplay = (logType: string) => {
    switch (logType) {
      case 'STARTED_TIMER':
        return 'Started Timer'
      case 'PAUSED_TIMER':
        return 'Paused Timer'
      case 'COMPLETED_TASK':
        return 'Completed Task'
      case 'UNCOMPLETED_TASK':
        return 'Marked as Uncomplete'
      case 'CHANGED_STATUS':
        return 'Updated Task'
      case 'TASK_CREATED':
        return 'Created Task'
      case 'START_TASK':
        return 'Started Task'
      case 'END_TASK':
        return 'Ended Task'
      default:
        return logType.replace('_', ' ')
    }
  }

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'COMPLETED_TASK':
        return 'bg-green-100 text-green-800'
      case 'STARTED_TIMER':
      case 'START_TASK':
        return 'bg-blue-100 text-blue-800'
      case 'PAUSED_TIMER':
        return 'bg-yellow-100 text-yellow-800'
      case 'UNCOMPLETED_TASK':
        return 'bg-orange-100 text-orange-800'
      case 'CHANGED_STATUS':
      case 'TASK_CREATED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (timerRunning && startTime) {
      interval = setInterval(() => {
        const currentTime = Date.now()
        const elapsed = Math.floor((currentTime - startTime) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [timerRunning, startTime])

  const handleTimerToggle = async () => {
    if (!task) return

    try {
      if (timerRunning) {
        // Pause timer
        const response = await fetch(`/api/tasks/${taskId}/timer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'pause',
            timeSpent: elapsedTime
          }),
        })

        if (response.ok) {
          setTimerRunning(false)
          setStartTime(null)
          setElapsedTime(0)
          // Refresh task data and logs
          await fetchTask(taskId)
          await fetchTaskLogs(taskId)
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
        }
      } else {
        // Start timer
        const response = await fetch(`/api/tasks/${taskId}/timer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'start'
          }),
        })

        if (response.ok) {
          setTimerRunning(true)
          setStartTime(Date.now())
          setElapsedTime(0)
          // Refresh task data and logs
          await fetchTask(taskId)
          await fetchTaskLogs(taskId)
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
        }
      }
    } catch (error) {
      console.error('Error toggling timer:', error)
      if (error instanceof Error && error.message.includes('Only the assigned user')) {
        alert('Only the assigned user can control the timer for this task')
      } else if (error instanceof Error && error.message.includes('Forbidden')) {
        alert('You do not have permission to control this timer')
      } else {
        alert('Failed to toggle timer')
      }
    }
  }

  const handleCompleteTask = async () => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          timeSpent: timerRunning ? elapsedTime : 0
        }),
      })

      if (response.ok) {
        setTimerRunning(false)
        setStartTime(null)
        setElapsedTime(0)
        // Refresh task data and logs
        await fetchTask(taskId)
        await fetchTaskLogs(taskId)
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error completing task:', error)
      if (error instanceof Error && error.message.includes('Only the assigned user')) {
        alert('Only the assigned user can complete this task')
      } else {
        alert('Failed to complete task')
      }
    }
  }

  const handleUncompleteTask = async () => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'uncomplete'
        }),
      })

      if (response.ok) {
        // Refresh task data and logs
        await fetchTask(taskId)
        await fetchTaskLogs(taskId)
      }
    } catch (error) {
      console.error('Error uncompleting task:', error)
      if (error instanceof Error && error.message.includes('Only the assigned user')) {
        alert('Only the assigned user can uncomplete this task')
      } else {
        alert('Failed to uncomplete task')
      }
    }
  }

  const handleSave = async () => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          deadline: editData.deadline || undefined, // Send undefined to preserve existing deadline
          assignedUserId: editData.assignedUserId || null
        })
      })

      if (response.ok) {
        setEditing(false)
        await fetchTask(task.id)
        await fetchTaskLogs(task.id)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  const handleCancel = () => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description || '',
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        assignedUserId: task.assignedUser?.id || ''
      })
    }
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/tasks')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete task')
        // Refresh logs in case of error
        await fetchTaskLogs(taskId)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const canDelete = () => {
    if (!task || !user) return false
    // Admin can delete any task, regular users can only delete their own tasks
    return user.userType === 'ADMIN' || task.creator.id === user.id
  }

  const canControlTimer = () => {
    if (!task || !user) return false
    // Only the assigned user can control the timer
    const canControl = task.assignedUser?.id === user.id
    console.log('Task Detail - Timer Control Check:', {
      taskId: task.id,
      taskTitle: task.title,
      taskAssignedUserId: task.assignedUser?.id,
      taskAssignedUserName: task.assignedUser?.name,
      currentUserId: user.id,
      currentUserName: user.name,
      canControl: canControl
    })
    return canControl
  }

  const isAdmin = user?.userType === 'ADMIN'

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
          <p className="text-gray-600 mb-4">The task you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/tasks')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div 
        className={`max-w-4xl mx-auto ${isTaskOverdue(task.deadline) ? 'border-2 border-red-300 rounded-lg p-6' : ''}`}
        style={{ 
          minHeight: '100vh',
          position: 'relative',
          overflowAnchor: 'none'
        }}
      >
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Tasks
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className={`w-full text-2xl sm:text-3xl font-bold border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 mb-2 ${
                    isTaskOverdue(task.deadline) ? 'text-red-700' : 'text-gray-900'
                  }`}
                  placeholder="Task title"
                />
              ) : (
                <h1 className={`text-2xl sm:text-3xl font-bold ${
                  isTaskOverdue(task.deadline) ? 'text-red-700' : 'text-gray-900'
                }`}>
                  {task.title}
                </h1>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {isTaskOverdue(task.deadline) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    OVERDUE
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(task.type)}`}>
                  {task.type === 'ADMIN_TASK' ? 'Admin' : 'Regular'}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              {isAdmin && editing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {canControlTimer() ? (
                    <>
                      <button
                        onClick={handleTimerToggle}
                        disabled={task.status === 'COMPLETED'}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          timerRunning 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } ${task.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {timerRunning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Pause</span> ({formatTime(elapsedTime)})
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span className="hidden sm:inline">Start Timer</span>
                          </>
                        )}
                      </button>
                      {task.status !== 'COMPLETED' && task.timeSum > 0 && (
                        <button
                          onClick={handleCompleteTask}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <div className="w-4 h-4">
                            <img src="/white-checkmark-24x24.svg" alt="Checkmark" className="w-full h-full"/>
                          </div>
                          <span className="hidden sm:inline">Complete Task</span>
                        </button>
                      )}
                      {task.status === 'COMPLETED' && (
                        <button
                          onClick={handleUncompleteTask}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <div className="w-4 h-4">
                            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <span className="hidden sm:inline">Mark Uncomplete</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 px-4 py-2 bg-gray-100 rounded-lg text-center">
                      Only the assigned user can control the timer
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Task Details */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Description</h2>
              {editing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder="Task description"
                />
              ) : (
                task.description ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description provided</p>
                )
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Task Info */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Assigned to</p>
                    {editing ? (
                      <select
                        value={editData.assignedUserId}
                        onChange={(e) => setEditData({ ...editData, assignedUserId: e.target.value })}
                        className="text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} {user.surname}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-600">{task.assignedUser.name} {task.assignedUser.surname}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created by</p>
                    <p className="text-sm text-gray-600">{task.creator.name} {task.creator.surname}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Deadline</p>
                    {editing ? (
                      <input
                        type="date"
                        value={editData.deadline}
                        onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                        className="text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    ) : (
                      <p className={`text-sm ${
                        isTaskOverdue(task.deadline) ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        {task.deadline ? formatDateTime(task.deadline) : 'No deadline set'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Time Spent</p>
                    <p className="text-sm text-gray-600">{formatTime(task.timeSum)}</p>
                  </div>
                </div>
              </div>
              {canDelete() && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    {isAdmin && (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        Edit task
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="text-red-600 underline hover:text-red-700 transition-colors text-sm"
                    >
                      Delete task
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Task Log */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Activity Log</h3>
              <div className="space-y-4">
                {taskLogs.length > 0 ? (
                  taskLogs.map((log) => (
                    <div key={log.id} className="border-l-4 border-gray-200 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLogTypeColor(log.logType)}`}>
                              {getLogTypeDisplay(log.logType)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{log.details}</p>
                          <p className="text-xs text-gray-500">
                            by {log.user.name} {log.user.surname} (@{log.user.username})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No activity logs yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              overflow: 'hidden'
            }}
          >
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setShowDeleteModal(false)}
              style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                touchAction: 'none'
              }}
            />
            <div 
              className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4" 
              style={{ 
                maxHeight: '90vh', 
                overflowY: 'auto',
                touchAction: 'pan-y'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Task</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete the task "<strong>{task?.title}</strong>"? 
                  This will permanently remove the task and all associated data.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Task'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 