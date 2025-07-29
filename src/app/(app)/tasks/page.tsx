'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Calendar, User, Filter, Play } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, isTaskOverdue } from '@/lib/utils'

interface User {
  id: string
  name: string
  surname: string
  email: string
  userType: 'ADMIN' | 'REGULAR_USER'
}

interface Task {
  id: string
  title: string
  description?: string
  deadline?: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  type: 'ADMIN_TASK' | 'REGULAR_TASK'
  timeSum: number
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

export default function TasksPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [runningTimers, setRunningTimers] = useState<{ [key: string]: { startTime: number; elapsed: number } }>({})

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      // Build URL with user filter
      let url = '/api/tasks'
      
      if (user?.userType === 'ADMIN') {
        // For admins, only add userId parameter if a specific user is selected
        if (selectedUserId && selectedUserId !== user.id) {
          url += `?userId=${selectedUserId}`
        }
        // If selectedUserId is empty or matches current user, don't add parameter
        // This will make the API return current user's tasks by default
      } else {
        // For regular users, always filter by their own user ID
        url += `?userId=${user?.id}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [user, selectedUserId])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/tasks')}`)
        return
      }
      
      // Set default user filter to current user
      setSelectedUserId(user?.id || '')
      
      // If user is admin, fetch all users for filtering
      if (user?.userType === 'ADMIN') {
        fetchUsers()
      }
    }
  }, [authLoading, isAuthenticated, user, router, fetchUsers])

  // Fetch tasks when selectedUserId is set
  useEffect(() => {
    if (user && selectedUserId !== undefined) {
      fetchTasks()
    }
    // Polling interval
    const interval = setInterval(() => {
      if (user && selectedUserId !== undefined) {
        fetchTasks()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [user, selectedUserId, fetchTasks])

  // Listen for task status changes from other pages
  useEffect(() => {
    const handleTaskStatusChange = () => {
      fetchTasks()
    }

    window.addEventListener('taskStatusChanged', handleTaskStatusChange)
    return () => window.removeEventListener('taskStatusChanged', handleTaskStatusChange)
  }, [fetchTasks])


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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer effect for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setRunningTimers(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(taskId => {
          const currentTime = Date.now()
          const elapsed = Math.floor((currentTime - updated[taskId].startTime) / 1000)
          updated[taskId].elapsed = elapsed
        })
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleTimerToggle = async (task: Task) => {
    try {
      const isRunning = runningTimers[task.id]
      
      if (isRunning) {
        // Pause timer
        const response = await fetch(`/api/tasks/${task.id}/timer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'pause',
            timeSpent: isRunning.elapsed
          }),
        })

        if (response.ok) {
          setRunningTimers(prev => {
            const updated = { ...prev }
            delete updated[task.id]
            return updated
          })
          // Refresh tasks
          fetchTasks()
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
        }
      } else {
        // Start timer
        const response = await fetch(`/api/tasks/${task.id}/timer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'start'
          }),
        })

        if (response.ok) {
          // Clear any other running timers since only one task can be active at a time
          setRunningTimers(() => {
            const updated: { [key: string]: { startTime: number; elapsed: number } } = {}
            // Only keep the new task as running
            updated[task.id] = { startTime: Date.now(), elapsed: 0 }
            return updated
          })
          // Refresh tasks - this will also reflect any auto-paused group tasks
          fetchTasks()
          
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
          
          // Trigger a page refresh to update group tasks if they were auto-paused
          // This ensures the group tasks page also reflects the changes
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('taskStatusChanged'))
          }, 100)
        }
      }
    } catch (error) {
      console.error('Error toggling timer:', error)
      alert('Failed to toggle timer')
    }
  }

  const handleCompleteTask = async (task: Task) => {
    try {
      const isRunning = runningTimers[task.id]
      const response = await fetch(`/api/tasks/${task.id}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          timeSpent: isRunning ? isRunning.elapsed : 0
        }),
      })

      if (response.ok) {
        setRunningTimers(prev => {
          const updated = { ...prev }
          delete updated[task.id]
          return updated
        })
        // Refresh tasks
        fetchTasks()
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
    }
  }

  const sortTasksByDeadlineString = (tasks: Task[]): Task[] => {
    return tasks.sort((a, b) => {
      // Tasks with no deadline go to the end
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      
      // Sort by deadline (earliest first)
      const dateA = new Date(a.deadline)
      const dateB = new Date(b.deadline)
      return dateA.getTime() - dateB.getTime()
    })
  }

  const filteredTasks = sortTasksByDeadlineString(
    tasks.filter(task => {
      const matchesFilter = filter === 'all' ? task.status !== 'COMPLETED' : task.status === filter
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch
    })
  )

  if (authLoading || loading) {
    return (
                  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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

  return (
    <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.userType === 'ADMIN' && selectedUserId && selectedUserId !== user.id
              ? `Tasks for ${users.find(u => u.id === selectedUserId)?.name} ${users.find(u => u.id === selectedUserId)?.surname}`
              : 'My Tasks'
            }
          </h1>
          <p className="mt-2 text-gray-600">
            {user?.userType === 'ADMIN' && selectedUserId && selectedUserId !== user.id
              ? `Viewing tasks assigned to ${users.find(u => u.id === selectedUserId)?.name} ${users.find(u => u.id === selectedUserId)?.surname}`
              : 'Manage and track your tasks'
            }
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* User Filter (Admin only) */}
            {user?.userType === 'ADMIN' && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Filter by User:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">My Tasks</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.surname}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="WAITING">Waiting</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                </select>
                <button
                  onClick={() => router.push('/tasks/create')}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  New Task
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task.deadline)
            return (
            <div 
              key={task.id} 
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                overdue ? 'border-2 border-red-500' : ''
              }`}
              onClick={() => router.push(`/tasks/${task.id}?t=${Date.now()}`)}
            >
              <div className="p-6">
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold mb-3 break-words ${
                    overdue ? 'text-red-600' : 'text-gray-900'
                  }`}>{task.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {overdue && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        OVERDUE
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(task.type)}`}>
                      {task.type === 'ADMIN_TASK' ? 'Admin Created' : 'Regular Task'}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[3rem]">
                  {task.description ? (
                    task.description
                  ) : (
                    <span className="text-gray-400 italic">No description</span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>{task.assignedUser.name} {task.assignedUser.surname}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {task.deadline ? formatDate(task.deadline) : 'No deadline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(task.timeSum)}</span>            
                  </div>
                  <div>
                  <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/tasks/${task.id}?t=${Date.now()}`)
                  }}
                  className="text-blue-600 underline hover:text-blue-800 transition-colors text-sm align-left">
                  View Details
                </button>
                  </div>        
                </div>

                {/* Timer Controls - Only show if current user is assigned to the task */}
                {task.assignedUser.id === user?.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTimerToggle(task)
                      }}
                      disabled={task.status === 'COMPLETED'}
                      className={`flex-1 px-4 py-3 text-sm rounded transition-colors flex items-center justify-center ${
                        runningTimers[task.id]
                                                      ? 'text-black' 
                            : 'bg-black hover:bg-gray-800 text-white'
                      } ${task.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={runningTimers[task.id] ? { backgroundColor: '#b9a057' } : {}}
                    >
                      {runningTimers[task.id] ? (
                        <>
                          <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          {formatTime(runningTimers[task.id].elapsed)}
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Timer
                        </>
                      )}
                    </button>
                    {task.status !== 'COMPLETED' && task.timeSum > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteTask(task)
                        }}
                        className="flex-1 px-4 py-3 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <div className="w-4 h-4 mr-2">
                          <img src="/white-checkmark-24x24.svg" alt="Checkmark" className="w-full h-full"/>
                        </div>
                        Complete Task
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center px-2 py-1 bg-gray-100 rounded">
                    Only assigned user can control timer
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">Create your first task to get started</p>
          </div>
        )}
      </div>
  )
} 