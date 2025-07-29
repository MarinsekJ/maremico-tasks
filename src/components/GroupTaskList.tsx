'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Pause, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import GroupTaskTimer from './GroupTaskTimer'
import { formatDate } from '@/lib/utils'
import type { GroupTaskWithRelations } from '@/types'

interface GroupTaskListProps {
  tasks: GroupTaskWithRelations[]
  loading: boolean
  onTaskUpdate: () => void
}

export default function GroupTaskList({ tasks, loading, onTaskUpdate }: GroupTaskListProps) {
  const { user } = useAuth()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  // Update activeTaskId when tasks are refreshed
  useEffect(() => {
    // Find the task that the current user is actively working on
    const userActiveTask = tasks.find(task => {
      const isInProgress = task.status === 'IN_PROGRESS'
      const isCurrentUserActive = task.activeWorkers?.some(aw => aw.userId === user?.id) || false
      return isInProgress && isCurrentUserActive
    })
    
    if (userActiveTask) {
      setActiveTaskId(userActiveTask.id)
    } else {
      setActiveTaskId(null)
    }
  }, [tasks, user?.id])

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

  // Filter tasks based on user type and membership
  const userTasks = user ? tasks.filter(task => {
    // If user is admin, show all tasks
    if (user.userType === 'ADMIN') {
      return true
    }
    
    // For regular users, only show tasks where they are a member
    const group = task.group as { users?: { user: { id: string } }[] }
    const isMember = Array.isArray(group.users) && group.users.some((groupUser: { user: { id: string } }) => groupUser.user.id === user.id)
    return isMember
  }) : []

  const filteredTasks = selectedGroup === 'all'
    ? userTasks 
    : userTasks.filter(task => task.group.name === selectedGroup)

  const uniqueGroups = Array.from(new Set(userTasks.map(task => task.group.name)))

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

  if (userTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <Users className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">
          {user ? 'No group tasks found for your groups' : 'Loading...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Group Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by group:</label>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Groups</option>
          {uniqueGroups.map(groupName => (
            <option key={groupName} value={groupName}>
              {groupName}
            </option>
          ))}
        </select>
      </div>

      {/* Tasks */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <div className="mb-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {task.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        <span className="ml-1 capitalize">{task.status.toLowerCase().replace('_', ' ')}</span>
                      </span>
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: task.group.color }}
                      >
                        {task.group.name}
                      </span>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 mb-3">
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Due: {formatDate(task.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Total Time */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Total Time: {formatTime(task.timeSum)}</span>
                  </div>
                </div>

                {/* Time per user */}
                {task.timePerUser.length > 0 && (
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: '#e3d9bc' }}>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Time per User
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.timePerUser
                        .sort((a, b) => b.timeSpent - a.timeSpent) // Sort by time spent (most to least)
                        .map((timeEntry, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-md "
                        >
                          <span className="font-medium text-sm text-gray-700">
                            {timeEntry.user.name} {timeEntry.user.surname}
                          </span>
                          <span className="text-sm font-semibold text-gray-600">
                            {formatTime(timeEntry.timeSpent)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <GroupTaskTimer
                  taskId={task.id}
                  status={task.status}
                  isActive={activeTaskId === task.id}
                  onStatusChange={(newStatus) => {
                    if (newStatus === 'IN_PROGRESS') {
                      // Clear any other active task since only one can be active at a time
                      setActiveTaskId(task.id)
                    } else {
                      setActiveTaskId(null)
                    }
                    // Refresh the task list to reflect the changes
                    onTaskUpdate()
                  }}
                  currentUserId={user?.id}
                  activeWorkers={task.activeWorkers}
                  timePerUser={task.timePerUser}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 