'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, CheckCircle, Users, TrendingUp, Calendar, X, User, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'


interface Task {
  id: string
  title: string
  description?: string
  status: string
  timeSum: number
  type: string
  deadline?: string
  createdAt: string
  updatedAt: string
  assignedUser?: {
    id: string
    name: string
    surname: string
  }
  creator?: {
    id: string
    name: string
    surname: string
  }
  group?: {
    id: string
    name: string
    color: string
  }
}

interface GroupTask {
  id: string
  title: string
  description?: string
  status: string
  timeSum: number
  createdAt: string
  updatedAt: string
  group: {
    id: string
    name: string
    color: string
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
}

interface Analytics {
  completedAdminTasks: number
  completedRegularTasks: number
  completedGroupTasks: number
  totalHours: number
  timePerTaskType: {
    admin: number
    regular: number
    group: number
  }
  tasksByType: {
    admin: Task[]
    regular: Task[]
    group: GroupTask[]
  }
}

interface User {
  id: string
  name: string
  surname: string
  username: string
  userType: 'ADMIN' | 'REGULAR_USER'
  isActive: boolean
}

export default function AnalyticsPage() {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<Task | GroupTask | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const isAdmin = currentUser?.userType === 'ADMIN'

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.filter((user: User) => user.isActive))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        ...(selectedUserId && { userId: selectedUserId })
      })
      
      const response = await fetch(`/api/analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear, selectedUserId])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }
      
      // Set default user to current user for regular users
      if (!isAdmin) {
        setSelectedUserId(currentUser?.id || '')
      } else {
        // For admins, default to current user but allow changing
        setSelectedUserId(currentUser?.id || '')
      }
      
      fetchAnalytics()
      fetchUsers()
    }
  }, [isAuthenticated, authLoading, isAdmin, currentUser, router, fetchAnalytics, fetchUsers])

  const formatTime = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  const calculateTaskPercentage = (task: Task | GroupTask, taskType: 'admin' | 'regular' | 'group') => {
    if (!analytics) return 0
    
    const totalTimeForType = analytics.timePerTaskType[taskType]
    if (totalTimeForType === 0) return 0
    
    const taskTimeInHours = task.timeSum / 3600
    return Math.round((taskTimeInHours / totalTimeForType) * 100)
  }

  const openTaskModal = (task: Task | GroupTask) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const closeTaskModal = () => {
    setShowTaskModal(false)
    setSelectedTask(null)
  }

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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="space-y-8">
        {/* Page Title */}
        <div className="mb-6">
          <p className="text-sm font-regular text-gray-600 mb-1">
            {isAdmin ? 'Viewing analytics for' : 'Your analytics for'}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin && selectedUser ? `${selectedUser.name} ${selectedUser.surname}` : `${currentUser?.name} ${currentUser?.surname}`}
          </h1>
        </div>

        {/* Header with User Filter and Date Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* User Filter (Admin only) */}
              {isAdmin && (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value={currentUser?.id}>My Analytics</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.surname} ({u.userType === 'ADMIN' ? 'Admin' : 'User'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {/* The getAvailableYears function was removed, so this select will always show the current year */}
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.completedAdminTasks + analytics.completedRegularTasks + analytics.completedGroupTasks}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalHours}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Group Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completedGroupTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Hours/Day</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.totalHours > 0 ? (analytics.totalHours / 30).toFixed(1) : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Task Type Breakdown */}
        <div className="grid gap-6 mb-8 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion by Type</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded mr-3"></div>
                  <span className="text-gray-700">Admin Tasks</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{analytics.completedAdminTasks}</p>
                  <p className="text-sm text-gray-500">{formatTime(analytics.timePerTaskType.admin)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="text-gray-700">Regular Tasks</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{analytics.completedRegularTasks}</p>
                  <p className="text-sm text-gray-500">{formatTime(analytics.timePerTaskType.regular)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span className="text-gray-700">Group Tasks</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{analytics.completedGroupTasks}</p>
                  <p className="text-sm text-gray-500">{formatTime(analytics.timePerTaskType.group)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Admin Tasks</span>
                  <span>{analytics.timePerTaskType.admin > 0 ? ((analytics.timePerTaskType.admin / analytics.totalHours) * 100).toFixed(1) : '0'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalHours > 0 ? (analytics.timePerTaskType.admin / analytics.totalHours) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Regular Tasks</span>
                  <span>{analytics.timePerTaskType.regular > 0 ? ((analytics.timePerTaskType.regular / analytics.totalHours) * 100).toFixed(1) : '0'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalHours > 0 ? (analytics.timePerTaskType.regular / analytics.totalHours) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Group Tasks</span>
                  <span>{analytics.timePerTaskType.group > 0 ? ((analytics.timePerTaskType.group / analytics.totalHours) * 100).toFixed(1) : '0'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalHours > 0 ? (analytics.timePerTaskType.group / analytics.totalHours) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Task Lists by Type */}
        <div className="grid gap-6 mb-8 lg:grid-cols-3">
          {/* Admin Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
              Admin Tasks ({analytics.completedAdminTasks})
            </h3>
            <div className="space-y-3">
              {analytics.tasksByType.admin.length > 0 ? (
                analytics.tasksByType.admin.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => openTaskModal(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-500">{formatTime(task.timeSum / 3600)}</p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-xs font-medium text-purple-600">
                          {calculateTaskPercentage(task, 'admin')}%
                        </p>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No completed admin tasks</p>
              )}
            </div>
          </div>

          {/* Regular Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              Regular Tasks ({analytics.completedRegularTasks})
            </h3>
            <div className="space-y-3">
              {analytics.tasksByType.regular.length > 0 ? (
                analytics.tasksByType.regular.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => openTaskModal(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-500">{formatTime(task.timeSum / 3600)}</p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-xs font-medium text-blue-600">
                          {calculateTaskPercentage(task, 'regular')}%
                        </p>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No completed regular tasks</p>
              )}
            </div>
          </div>

          {/* Group Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              Group Tasks ({analytics.completedGroupTasks})
            </h3>
            <div className="space-y-3">
              {analytics.tasksByType.group.length > 0 ? (
                analytics.tasksByType.group.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => openTaskModal(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: task.group.color }}
                          ></div>
                          <p className="text-sm text-gray-500">{task.group.name}</p>
                        </div>
                        <p className="text-sm text-gray-500">{formatTime(task.timeSum / 3600)}</p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-xs font-medium text-green-600">
                          {calculateTaskPercentage(task, 'group')}%
                        </p>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No completed group tasks</p>
              )}
            </div>
          </div>
        </div>

        {/* Task Detail Modal */}
        {showTaskModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Task Details</h3>
                  <button
                    onClick={closeTaskModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedTask.title}</h4>
                    {selectedTask.description && (
                      <p className="text-gray-600 mt-1">{selectedTask.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="text-gray-900">{selectedTask.status.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Time Spent</p>
                      <p className="text-gray-900">{formatTime(selectedTask.timeSum / 3600)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-gray-900">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Completed</p>
                      <p className="text-gray-900">{new Date(selectedTask.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Task Type Specific Info */}
                  {'group' in selectedTask ? (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Group</p>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: selectedTask.group?.color || '#ccc' }}
                        ></div>
                        <span className="text-gray-900">{selectedTask.group?.name || 'Unknown Group'}</span>
                      </div>
                      
                      {('timePerUser' in selectedTask) && selectedTask.timePerUser && selectedTask.timePerUser.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-500 mb-2">Time per User</p>
                          <div className="space-y-2">
                            {selectedTask.timePerUser.map((timeEntry: { userId: string; timeSpent: number; user: { name: string; surname: string } }) => (
                              <div key={timeEntry.userId} className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                  {timeEntry.user.name} {timeEntry.user.surname}
                                </span>
                                <span className="text-gray-900">{formatTime(timeEntry.timeSpent / 3600)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Task Type</p>
                      <p className="text-gray-900">{selectedTask.type.replace('_', ' ')}</p>
                      
                      {selectedTask.assignedUser && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-500">Assigned To</p>
                          <p className="text-gray-900">
                            {selectedTask.assignedUser.name} {selectedTask.assignedUser.surname}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Percentage of Total Time */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Percentage of Total Time</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const taskType = 'group' in selectedTask ? 'group' : 
                          selectedTask.type === 'ADMIN_TASK' ? 'admin' : 'regular'
                        return calculateTaskPercentage(selectedTask, taskType)
                      })()}%
                    </p>
                    <p className="text-sm text-gray-600">
                      of total time spent on {('group' in selectedTask ? 'group' : selectedTask.type === 'ADMIN_TASK' ? 'admin' : 'regular')} tasks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
} 