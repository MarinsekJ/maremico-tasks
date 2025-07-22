'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Calendar, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'


interface User {
  id: string
  name: string
  surname: string
  email: string
  userType: 'ADMIN' | 'REGULAR_USER'
}

export default function CreateTaskPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedUserId: ''
  })
  const [hasDeadline, setHasDeadline] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/tasks/create')}`)
        return
      }
      
      // Set assignedUserId to current user for both admin and regular users
      setFormData(prev => ({ ...prev, assignedUserId: user?.id || '' }))
      
      // If user is admin, fetch all users for assignment
      if (user?.userType === 'ADMIN') {
        fetchUsers()
      }
    }
  }, [isAuthenticated, authLoading, user, router])



  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
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





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    setLoading(true)

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        deadline: formData.deadline || undefined,
        assignedUserId: formData.assignedUserId || user?.id,
        type: user?.userType === 'ADMIN' ? 'ADMIN_TASK' : 'REGULAR_TASK'
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        router.push('/tasks')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
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

  if (!isAuthenticated) {
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
            Back to Tasks
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
          <p className="mt-2 text-gray-600">
            {user?.userType === 'ADMIN' 
              ? 'Create a task and assign it to any user' 
              : 'Create a new task for yourself'
            }
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
                  placeholder="Enter task title"
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
                placeholder="Enter task description (optional)"
              />
            </div>

            {/* Assigned User (Admin only) */}
            {user?.userType === 'ADMIN' && (
              <div>
                <label htmlFor="assignedUserId" className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to User *
                </label>
                <div className="relative">
                  <select
                    id="assignedUserId"
                    name="assignedUserId"
                    value={formData.assignedUserId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-900">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id} className="text-gray-900">
                        {user.name} {user.surname}
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}

            {/* Regular User Assignment Info */}
            {user?.userType === 'REGULAR_USER' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <User className="h-5 w-5" />
                  <span className="font-medium">Task will be assigned to you</span>
                </div>
                <p className="text-blue-600 text-sm mt-1">
                  Regular users can only create tasks for themselves
                </p>
              </div>
            )}

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
                  No deadline will be set for this task
                </p>
              )}
            </div>

            {/* Task Type Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-800">
                <span className="font-medium">Task Type:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user?.userType === 'ADMIN' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.userType === 'ADMIN' ? 'Admin Task' : 'Regular Task'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                {user?.userType === 'ADMIN' 
                  ? 'Admin tasks can be assigned to any user and have higher priority'
                  : 'Regular tasks are personal tasks for individual users'
                }
              </p>
            </div>

            {/* Default Values Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Default Values</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Status: Waiting</li>
                <li>• Time Sum: 0 seconds</li>
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
                    Create Task
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