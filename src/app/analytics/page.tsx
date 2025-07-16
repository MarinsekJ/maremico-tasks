'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Clock, CheckCircle, Users, TrendingUp, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

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
    admin: any[]
    regular: any[]
    group: any[]
  }
}

export default function AnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/analytics')}`)
        return
      }
      fetchAnalytics()
    }
  }, [isAuthenticated, authLoading, router, selectedMonth, selectedYear])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">Track your productivity and task completion</p>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.completedAdminTasks + analytics.completedRegularTasks + analytics.completedGroupTasks}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Group Tasks</p>
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

        {/* Top Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tasks by Time Spent</h3>
          <div className="space-y-4">
            {[...analytics.tasksByType.admin, ...analytics.tasksByType.regular, ...analytics.tasksByType.group]
              .sort((a, b) => b.timeSum - a.timeSum)
              .slice(0, 5)
              .map((task, index) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-400 mr-4">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatTime(task.timeSum / 3600)}</p>
                    <p className="text-sm text-gray-500">{task.status.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
} 