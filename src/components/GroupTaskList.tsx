'use client'

import { useState } from 'react'
import { Clock, Play, Pause, CheckCircle, AlertCircle, Users } from 'lucide-react'
import GroupTaskTimer from './GroupTaskTimer'
import { formatDate } from '@/lib/utils'

interface GroupTask {
  id: string
  title: string
  description?: string
  deadline?: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  timeSum: number
  group: {
    name: string
    color: string
  }
  timePerUser: {
    user: {
      name: string
      surname: string
    }
    timeSpent: number
  }[]
}

interface GroupTaskListProps {
  tasks: GroupTask[]
  loading: boolean
  onTaskUpdate: () => void
}

export default function GroupTaskList({ tasks, loading, onTaskUpdate }: GroupTaskListProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

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

  const filteredTasks = selectedGroup === 'all' 
    ? tasks 
    : tasks.filter(task => task.group.name === selectedGroup)

  const uniqueGroups = Array.from(new Set(tasks.map(task => task.group.name)))

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
          <Users className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No group tasks found</p>
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
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 flex-1 min-w-0 break-words line-clamp-2">
                    {task.title}
                  </h3>
                  <div className="flex gap-2 flex-shrink-0">
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
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                  {task.deadline && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Due: {formatDate(task.deadline)}</span>
                  </div>
                )}
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Total Time: {formatTime(task.timeSum)}</span>
                  </div>
                </div>

                {/* Time per user */}
                {task.timePerUser.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Time per user:</h4>
                    <div className="flex flex-wrap gap-2">
                      {task.timePerUser.map((timeEntry, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          <span className="font-medium">
                            {timeEntry.user.name} {timeEntry.user.surname}:
                          </span>
                          <span>{formatTime(timeEntry.timeSpent)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="ml-4 flex-shrink-0">
                <GroupTaskTimer
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
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 