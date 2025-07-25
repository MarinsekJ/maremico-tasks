'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Calendar, Users, Filter, Play } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { formatDate, isTaskOverdue } from '@/lib/utils'

interface Group {
  id: string
  name: string
  description?: string
  color: string
  users?: Array<{
    userId: string
    user?: {
      username: string
    }
  }>
}

interface GroupTask {
  id: string
  title: string
  description?: string
  deadline?: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  timeSum: number
  group: {
    id: string
    name: string
    description?: string
    color: string
    users?: Array<{
      userId: string
      user?: {
        username: string
      }
    }>
  }
  timePerUser: {
    userId: string
    timeSpent: number
    user: {
      id: string
      name: string
      surname: string
    }
  }[]
  createdAt: string
  updatedAt: string
}

export default function GroupTasksPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [runningTimers, setRunningTimers] = useState<{ [key: string]: { startTime: number; elapsed: number } }>({})

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }
      
      fetchGroups()
    }
  }, [isAuthenticated, authLoading, user, router])

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchGroupTasks = useCallback(async () => {
    try {
      // Build URL with group filter
      let url = '/api/group-tasks'
      
      if (selectedGroupId) {
        url += `?groupId=${selectedGroupId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setGroupTasks(data)
      }
    } catch (error) {
      console.error('Error fetching group tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedGroupId])

  // Fetch group tasks when selectedGroupId is set
  useEffect(() => {
    if (user) {
      fetchGroupTasks()
    }
  }, [selectedGroupId, user, fetchGroupTasks])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  // Listen for task status changes from other pages
  useEffect(() => {
    const handleTaskStatusChange = () => {
      fetchGroupTasks()
    }

    window.addEventListener('taskStatusChanged', handleTaskStatusChange)
    return () => window.removeEventListener('taskStatusChanged', handleTaskStatusChange)
  }, [fetchGroupTasks])

  const handleTimerToggle = async (task: GroupTask) => {
    try {
      const isRunning = runningTimers[task.id]
      
      if (isRunning) {
        // Pause timer
        const response = await fetch(`/api/group-tasks/${task.id}/timer`, {
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
          fetchGroupTasks()
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
        }
      } else {
        // Start timer
        const response = await fetch(`/api/group-tasks/${task.id}/timer`, {
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
          // Refresh tasks - this will also reflect any auto-paused regular tasks
          fetchGroupTasks()
          
          // Trigger event for ActiveTaskCard to refresh
          window.dispatchEvent(new CustomEvent('taskStatusChanged'))
          
          // Trigger a page refresh to update regular tasks if they were auto-paused
          // This ensures the regular tasks page also reflects the changes
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

  const handleCompleteTask = async (task: GroupTask) => {
    try {
      const isRunning = runningTimers[task.id]
      const response = await fetch(`/api/group-tasks/${task.id}/timer`, {
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
        fetchGroupTasks()
        // Trigger event for ActiveTaskCard to refresh
        window.dispatchEvent(new CustomEvent('taskStatusChanged'))
      }
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
    }
  }

  const sortGroupTasksByDeadline = (tasks: GroupTask[]): GroupTask[] => {
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

  const filteredGroupTasks = sortGroupTasksByDeadline(
    groupTasks.filter(task => {
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
    <DashboardLayout>
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedGroupId
              ? `Group Tasks - ${groups.find(g => g.id === selectedGroupId)?.name}`
              : 'Group Tasks'
            }
          </h1>
          <p className="mt-2 text-gray-600">
            {selectedGroupId
              ? `Viewing tasks for ${groups.find(g => g.id === selectedGroupId)?.name}`
              : 'Manage and track group tasks'
            }
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Group Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Group:</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search group tasks..."
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
                {user?.userType === 'ADMIN' && (
                  <button
                    onClick={() => router.push('/group-tasks/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    New Group Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Group Tasks Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroupTasks.map((task) => {
            const overdue = isTaskOverdue(task.deadline)
            const totalTimeSpent = task.timePerUser.reduce((sum: number, time: { timeSpent: number }) => sum + time.timeSpent, 0)
            
            // Check if user can interact with this task (must be a member of the group)
            const canInteractWithTask = user && 
              task.group?.users?.some((groupUser: { userId: string }) => groupUser.userId === user.id)
            
            // Debug logging
            console.log(`[DEBUG] Task: ${task.title}, User: ${user?.username} (ID: ${user?.id}), Can interact: ${canInteractWithTask}`)
            console.log(`[DEBUG] Group users:`, task.group?.users?.map((gu: { userId: string; user?: { username: string } }) => ({ userId: gu.userId, username: gu.user?.username })))
            console.log(`[DEBUG] User ID comparison:`, user?.id, 'vs group users:', task.group?.users?.map((gu: { userId: string }) => gu.userId))
            return (
            <div 
              key={task.id} 
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                overdue ? 'border-2 border-red-500' : ''
              }`}
              onClick={() => router.push(`/group-tasks/${task.id}`)}
            >
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className={`text-lg font-semibold flex-1 min-w-0 break-words line-clamp-2 ${
                      overdue ? 'text-red-600' : 'text-gray-900'
                    }`}>{task.title}</h3>
                    <div className="flex gap-2 flex-shrink-0">
                      {overdue && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          OVERDUE
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
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
                    <div 
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: task.group.color }}
                    ></div>
                    <span>{task.group.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{task.timePerUser.length} member{task.timePerUser.length !== 1 ? 's' : ''} working</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {task.deadline ? formatDate(task.deadline) : 'No deadline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(totalTimeSpent)}</span>            
                  </div>
                  <div>
                  <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/group-tasks/${task.id}`)
                  }}
                  className="text-blue-600 underline hover:text-blue-800 transition-colors text-sm align-left">
                  View Details
                </button>
                  </div>        
                </div>

                {canInteractWithTask ? (
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
                    {task.status !== 'COMPLETED' && totalTimeSpent > 0 && (
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
                  <div className="text-center py-3 text-sm text-gray-500">
                    View only - not a member of this group
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>

        {filteredGroupTasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Users className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No group tasks found</h3>
            <p className="text-gray-600">
              {user?.userType === 'ADMIN' 
                ? 'Create your first group task to get started'
                : 'No group tasks are available for your groups'
              }
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 