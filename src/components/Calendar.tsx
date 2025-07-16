'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'

interface Task {
  id: string
  title: string
  deadline?: string
  status: string
}

interface CalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  tasks: Task[]
}

export default function Calendar({ selectedDate, onDateSelect, tasks }: CalendarProps) {
  const router = useRouter()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }) // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.deadline) return false
      return isSameDay(new Date(task.deadline), date)
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500'
      case 'IN_PROGRESS':
        return 'bg-blue-500'
      case 'PAUSED':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  return (
    <div className="space-y-4">
      {/* Week header with task counts */}
      <div className="grid grid-cols-5 gap-1">
        {weekDays.slice(0, 5).map((day) => {
          const dayTasks = getTasksForDate(day)
          const completedTasks = dayTasks.filter(task => task.status === 'COMPLETED').length
          const totalTasks = dayTasks.length

          return (
            <div
              key={day.toISOString()}
              className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                isSameDay(day, selectedDate)
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : isToday(day)
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => onDateSelect(day)}
            >
              <div className="text-xs font-medium">
                {format(day, 'EEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(day, 'd')}
              </div>
              {totalTasks > 0 && (
                <div className="text-xs text-gray-500">
                  {completedTasks}/{totalTasks}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tasks for selected date */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Tasks for {format(selectedDate, 'EEEE, MMMM d')}
        </h3>
        <div className="space-y-2">
          {getTasksForDate(selectedDate).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)} flex-shrink-0`} />
                <span className="text-sm text-gray-700 truncate">
                  {task.title}
                </span>
              </div>
              <button
                onClick={() => handleViewTask(task.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
              >
                <Eye className="h-3 w-3" />
                View task
              </button>
            </div>
          ))}
          {getTasksForDate(selectedDate).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No tasks scheduled
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 