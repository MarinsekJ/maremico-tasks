'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import TaskList from '@/components/TaskList'
import GroupTaskList from '@/components/GroupTaskList'
import Calendar from '@/components/Calendar'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { formatDate, isTaskOverdue, sortTasksByDeadline } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState([])
  const [groupTasks, setGroupTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchGroupTasks()
    }
  }, [user, selectedDate])

  // Listen for task status changes from other pages
  useEffect(() => {
    const handleTaskStatusChange = () => {
      fetchTasks()
      fetchGroupTasks()
    }

    window.addEventListener('taskStatusChanged', handleTaskStatusChange)
    return () => window.removeEventListener('taskStatusChanged', handleTaskStatusChange)
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchGroupTasks = async () => {
    try {
      const response = await fetch('/api/group-tasks')
      if (response.ok) {
        const data = await response.json()
        setGroupTasks(data)
      }
    } catch (error) {
      console.error('Error fetching group tasks:', error)
    }
  }

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return tasks.filter((task: any) => {
      if (!task.deadline) return false
      const taskDate = format(new Date(task.deadline), 'yyyy-MM-dd')
      return taskDate === dateStr
    })
  }

  const getTodayTasks = () => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    
    console.log('Today\'s date string:', todayStr)
    console.log('All tasks:', tasks)
    
    const todayTasks = tasks.filter((task: any) => {
      if (!task.deadline) return false
      if (task.status === 'COMPLETED') return false // Filter out completed tasks
      const taskDate = format(new Date(task.deadline), 'yyyy-MM-dd')
      console.log('Task deadline:', task.deadline, 'Task date string:', taskDate)
      return taskDate === todayStr
    })
    
    console.log('Today\'s tasks found:', todayTasks.length)
    return todayTasks
  }

  const getOverdueTasks = () => {
    return tasks.filter((task: any) => 
      isTaskOverdue(task.deadline) && task.status !== 'COMPLETED'
    )
  }

  const getUndatedTasks = () => {
    return tasks.filter((task: any) => !task.deadline && task.status !== 'COMPLETED')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's on your plate today
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-500">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Today's Tasks & Undated Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overdue Tasks */}
            {getOverdueTasks().length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border-2 border-red-300 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-red-700">
                    Overdue Tasks
                  </h2>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-red-600 font-medium">
                      Past Deadline
                    </p>
                  </div>
                </div>
                <TaskList 
                  tasks={sortTasksByDeadline(getOverdueTasks())} 
                  loading={loadingTasks}
                  onTaskUpdate={fetchTasks}
                  currentUserId={user.id}
                />
              </div>
            )}

            {/* Today's Tasks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Today's Tasks
                </h2>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500">
                    {format(new Date(), 'EEEE')}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">
                    {formatDate(new Date())}
                  </p>
                </div>
              </div>
              <TaskList 
                tasks={sortTasksByDeadline(getTodayTasks())} 
                loading={loadingTasks}
                onTaskUpdate={fetchTasks}
                currentUserId={user.id}
              />
            </div>

            {/* Tasks with No Deadline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Tasks with No Deadline
                </h2>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500">
                    No deadline set
                  </p>
                </div>
              </div>
              <TaskList 
                tasks={sortTasksByDeadline(getUndatedTasks())} 
                loading={loadingTasks}
                onTaskUpdate={fetchTasks}
                currentUserId={user.id}
              />
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Weekly Calendar
            </h2>
            <Calendar 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              tasks={tasks}
            />
          </div>
        </div>

        {/* Group Tasks */}
        <div className="bg-white rounded-xl text-gray-700 shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Group Tasks
          </h2>
          <GroupTaskList
            tasks={groupTasks} 
            loading={loadingTasks}
            onTaskUpdate={fetchGroupTasks}
          />
        </div>
      </div>
    </DashboardLayout>
  )
} 