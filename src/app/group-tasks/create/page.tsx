'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Users, Calendar, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { formatDate } from '@/lib/utils'

interface Group {
  id: string
  name: string
  description?: string
  color: string
}

export default function CreateGroupTaskPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    groupId: ''
  })
  const [hasDeadline, setHasDeadline] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/group-tasks/create')}`)
        return
      }
      
      // Only admins can create group tasks
      if (user?.userType !== 'ADMIN') {
        router.push('/group-tasks')
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDeadlineToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasDeadline(e.target.checked)
    if (!e.target.checked) {
      setFormData(prev => ({ ...prev, deadline: '' }))
    }
  }

  // Convert ISO date (yyyy-mm-dd) to display format (dd.mm.yyyy)
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    return formatDate(date)
  }

  // Convert display format (dd.mm.yyyy) to ISO format (yyyy-mm-dd)
  const formatDateForInput = (displayDate: string): string => {
    if (!displayDate) return ''
    const [day, month, year] = displayDate.split('.')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    if (!formData.groupId) {
      alert('Group is required')
      return
    }

    setLoading(true)

    try {
      const groupTaskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        deadline: formData.deadline || undefined,
        groupId: formData.groupId
      }

      const response = await fetch('/api/group-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupTaskData),
      })

      if (response.ok) {
        router.push('/group-tasks')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create group task')
      }
    } catch (error) {
      console.error('Error creating group task:', error)
      alert('Failed to create group task')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
              <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.userType !== 'ADMIN') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Group Tasks
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Group Task</h1>
          <p className="mt-2 text-gray-600">
            Create a task that can be worked on by multiple group members
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Enter group task title"
                  required
                />
                <FileText className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Enter group task description (optional)"
              />
            </div>

            {/* Group Selection */}
            <div>
              <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Group *
              </label>
              <div className="relative">
                <select
                  id="groupId"
                  name="groupId"
                  value={formData.groupId}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="" className="text-gray-900">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id} className="text-gray-900">
                      {group.name}
                    </option>
                  ))}
                </select>
                <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {formData.groupId && (
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: groups.find(g => g.id === formData.groupId)?.color || '#3B82F6' }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {groups.find(g => g.id === formData.groupId)?.description || 'No description'}
                  </span>
                </div>
              )}
            </div>

            {/* Group Task Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                <span className="font-medium">Group Task Information</span>
              </div>
              <p className="text-blue-600 text-sm mt-1">
                All members of the selected group will be able to work on this task and track their individual time contributions.
              </p>
            </div>

            {/* Deadline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="hasDeadline"
                  checked={hasDeadline}
                  onChange={handleDeadlineToggle}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasDeadline" className="text-sm font-medium text-gray-700">
                  Set a deadline
                </label>
              </div>
              {hasDeadline && (
                <div className="relative">
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  />
                  <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              )}
              {!hasDeadline && (
                <p className="text-sm text-gray-500">
                  No deadline will be set for this group task
                </p>
              )}
            </div>

            {/* Task Type Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-800">
                <span className="font-medium">Task Type:</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  Group Task
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Group tasks allow multiple users to collaborate and track their individual time contributions
              </p>
            </div>

            {/* Default Values Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Default Values</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Status: Waiting</li>
                <li>• Time Sum: 0 seconds</li>
                <li>• Individual time tracking: Enabled for all group members</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Create Group Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
} 