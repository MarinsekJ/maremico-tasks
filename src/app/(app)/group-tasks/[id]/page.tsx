'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface GroupTask {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  timeSum: number
  createdAt: string
  updatedAt: string
  groupId: string
  group: {
    id: string
    name: string
    color: string
    users?: Array<{
      userId: string
      user: {
        id: string
        name: string
        surname: string
        username: string
      }
    }>
  }
  timePerUser: Array<{
    id: string
    userId: string
    timeSpent: number
    user: {
      id: string
      name: string
      surname: string
      username: string
    }
  }>
}

interface TaskLog {
  id: string
  userId: string
  taskId: string | null
  taskType: string | null
  logType: string
  details: string
  createdAt: string
  user: {
    id: string
    name: string
    surname: string
    username: string
  }
}

export default function GroupTaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [groupTask, setGroupTask] = useState<GroupTask | null>(null)
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [user, setUser] = useState<{ id: string; userType: string } | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'>('WAITING')

  const fetchGroupTask = useCallback(async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/group-tasks/${id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched group task data:', data)
        setGroupTask(data)
        setTitle(data.title)
        setDescription(data.description || '')
        setDeadline(data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : '')
        setStatus(data.status)
      } else {
        console.error('Failed to fetch group task')
      }
    } catch (error) {
      console.error('Error fetching group task:', error)
    } finally {
      setIsLoading(false)
    }
  }, [params])

  const fetchLogs = useCallback(async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/group-tasks/${id}/logs`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }, [params])

  useEffect(() => {
    const initializePage = async () => {
      // Fetch current user from API
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
      
      await fetchGroupTask()
      await fetchLogs()
    }
    
    initializePage()
  }, [fetchGroupTask, fetchLogs])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - timerStartTime)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timerStartTime])

  const handleSave = async () => {
    console.log('Save button clicked, sending data:', {
      title,
      description,
      deadline: deadline || null,
      status,
    })
    setIsSaving(true)
    try {
      const { id } = await params
      const response = await fetch(`/api/group-tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          deadline: deadline || null,
          status,
        }),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setGroupTask(updatedTask)
        setIsEditing(false)
        fetchLogs()
      } else {
        const errorData = await response.json()
        console.error('Failed to update group task:', errorData)
        alert('Failed to update group task. Please try again.')
      }
    } catch (error) {
      console.error('Error updating group task:', error)
      alert('Error updating group task. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTimerAction = async (action: 'start' | 'pause' | 'complete' | 'uncomplete') => {
    try {
      const timeSpent = action === 'pause' || action === 'complete' ? Math.floor(elapsedTime / 1000) : 0
      const { id } = await params
      
      const response = await fetch(`/api/group-tasks/${id}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          timeSpent,
        }),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setGroupTask(updatedTask)
        
        if (action === 'start') {
          setIsTimerRunning(true)
          setTimerStartTime(Date.now())
          setElapsedTime(0)
        } else if (action === 'pause') {
          setIsTimerRunning(false)
          setTimerStartTime(null)
          setElapsedTime(0)
        } else if (action === 'complete') {
          setIsTimerRunning(false)
          setTimerStartTime(null)
          setElapsedTime(0)
        }
        
        fetchLogs()
        
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error updating timer:', error)
    }
  }

  const handleDelete = async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/group-tasks/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/group-tasks')
      } else {
        console.error('Failed to delete group task')
      }
    } catch (error) {
      console.error('Error deleting group task:', error)
    }
  }

  const handleEditClick = () => {
    console.log('Edit button clicked, current groupTask:', groupTask)
    // Reset form state to current task values
    if (groupTask) {
      setTitle(groupTask.title)
      setDescription(groupTask.description || '')
      setDeadline(groupTask.deadline ? new Date(groupTask.deadline).toISOString().split('T')[0] : '')
      setStatus(groupTask.status)
      console.log('Form state set to:', {
        title: groupTask.title,
        description: groupTask.description || '',
        deadline: groupTask.deadline ? new Date(groupTask.deadline).toISOString().split('T')[0] : '',
        status: groupTask.status
      })
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    // Reset form state to current task values
    if (groupTask) {
      setTitle(groupTask.title)
      setDescription(groupTask.description || '')
      setDeadline(groupTask.deadline ? new Date(groupTask.deadline).toISOString().split('T')[0] : '')
      setStatus(groupTask.status)
    }
    setIsEditing(false)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'STARTED_TIMER': return 'bg-blue-100 text-blue-800'
      case 'PAUSED_TIMER': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED_TASK': return 'bg-green-100 text-green-800'
      case 'UNCOMPLETED_TASK': return 'bg-gray-100 text-gray-800'
      case 'CHANGED_STATUS': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!groupTask) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Group Task Not Found</h2>
        <button
          onClick={() => router.push('/group-tasks')}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Back to Group Tasks
        </button>
      </div>
    )
  }

  // Debug the access control
  console.log('User:', user)
  console.log('Group users:', groupTask.group.users)
  console.log('User type:', user?.userType)
  
  // Check if user can edit this group task
  const canEdit = user && (
    user.userType === 'ADMIN' || 
    groupTask.group.users?.some(groupUser => groupUser.userId === user.id)
  )

  // Check if user can interact with timer (must be a member of the group)
  const canInteractWithTimer = user && 
    groupTask.group.users?.some(groupUser => groupUser.userId === user.id)

  console.log('Rendering with isEditing:', isEditing, 'form values:', { title, description, deadline, status })
  console.log('Can edit:', canEdit)
  console.log('User authenticated:', !!user)
  
  return (
    <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Group Task' : groupTask.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Group: <span className="font-medium" style={{ color: groupTask.group.color }}>
                {groupTask.group.name}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            
            
            {canEdit && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                    >
                      Edit
                    </button>
                  </>
                )}
              </>
            )}
            
            {/* Always show edit button for testing */}
            {!canEdit && user && (
              <button
                onClick={handleEditClick}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
              >
                Edit (Testing)
              </button>
            )}
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{groupTask.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(groupTask.status)}`}>
                {groupTask.status.replace('_', ' ')}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
              {isEditing ? (
                <input
                  type="date"
                  value={deadline ? deadline.split('T')[0] : ''}
                  onChange={(e) => setDeadline(e.target.value ? `${e.target.value}T00:00` : '')}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">
                  {groupTask.deadline ? new Date(groupTask.deadline).toLocaleDateString('en-GB') : 'No deadline'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Time</label>
              <p className="text-gray-900">{formatTime(groupTask.timeSum + (groupTask.status === 'IN_PROGRESS' ? Math.floor(elapsedTime / 1000) : 0))}</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{groupTask.description || 'No description'}</p>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timer Controls</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl text-gray-700 font-mono">
              {formatTime(Math.floor(elapsedTime / 1000))}
            </div>
            {canInteractWithTimer ? (
              <div className="flex gap-2">
              {groupTask.status === 'WAITING' && (
                <button
                  onClick={() => handleTimerAction('start')}
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                >
                  Start
                </button>
              )}
              {groupTask.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => handleTimerAction('pause')}
                    className="text-black px-4 py-2 rounded"
            style={{ backgroundColor: '#b9a057' }}
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleTimerAction('complete')}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                  >
                    Complete
                  </button>
                </>
              )}
              {groupTask.status === 'PAUSED' && (
                <>
                  <button
                    onClick={() => handleTimerAction('start')}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleTimerAction('complete')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Complete
                  </button>
                </>
              )}
              {groupTask.status === 'COMPLETED' && (
                <button
                  onClick={() => handleTimerAction('uncomplete')}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Mark Incomplete
                </button>
              )}
            </div>
            ) : (
              <div className="text-gray-500 text-sm">
                You can view this task but cannot interact with it since you are not a member of this group
              </div>
            )}
          </div>
        </div>

        {/* Member Time Tracking */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Time Tracking</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Spent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupTask.timePerUser.map((timeEntry) => (
                  <tr key={timeEntry.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {timeEntry.user.name} {timeEntry.user.surname}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{timeEntry.user.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(timeEntry.timeSpent)}
                    </td>
                  </tr>
                ))}
                {groupTask.timePerUser.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                      No time tracking data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Logs</h3>
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {log.user.name.charAt(0)}{log.user.surname.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {log.user.name} {log.user.surname}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(log.logType)}`}>
                      {log.logType.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{log.details}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-gray-500 py-4">No activity logs yet</p>
            )}
          </div>
        </div>

        {/* Delete Button - Bottom Left */}
        {user?.userType === 'ADMIN' && !isEditing && (
          <div className="mt-6">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 underline hover:text-red-800"
            >
              Delete Group Task
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Group Task</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{groupTask.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
                 )}
       </div>
  )
} 