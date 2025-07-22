'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'

interface User {
  id: string
  name: string
  surname: string
  username: string
  email: string
  userType: 'ADMIN' | 'REGULAR_USER'
  isActive: boolean
}

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    userIds: [] as string[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [groupId, setGroupId] = useState<string>('')

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setGroupId(resolvedParams.id)
    }
    getParams()
  }, [params])

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched group data:', data) // Debug log
        setFormData({
          name: data.name,
          description: data.description || '',
          color: data.color,
          userIds: data.users.map((u: { user: { id: string } }) => u.user.id)
        })
      } else {
        console.error('Failed to fetch group:', response.status)
        router.push('/admin/groups')
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      router.push('/admin/groups')
    } finally {
      setLoading(false)
    }
  }, [groupId, router])

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

  useEffect(() => {
    if (!authLoading && groupId) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/admin/groups/${groupId}`)}`)
        return
      }
      
      if (user?.userType !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      
      fetchGroup()
      fetchUsers()
    }
  }, [isAuthenticated, authLoading, user, router, groupId, fetchGroup, fetchUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required'
    }
    if (formData.name.length < 2) {
      newErrors.name = 'Group name must be at least 2 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
          userIds: formData.userIds
        })
      })

      if (response.ok) {
        router.push('/admin/groups')
      } else {
        const errorData = await response.json()
        if (errorData.error) {
          setErrors({ general: errorData.error })
        }
      }
    } catch (error) {
      console.error('Error updating group:', error)
      setErrors({ general: 'An error occurred while updating the group' })
    } finally {
      setSaving(false)
    }
  }

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }))
  }

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      userIds: prev.userIds.length === users.length ? [] : users.map(user => user.id)
    }))
  }

  const isAllSelected = users.length > 0 && formData.userIds.length === users.length

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

  if (!isAuthenticated || user?.userType !== 'ADMIN') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Groups
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Edit group {formData.name}</h1>
            <p className="text-gray-600 mt-1">Update group information and members</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter group name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                    Group Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer"
                    />                
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter group description (optional)"
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Group Members</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {/* Select All Toggle */}
                {users.length > 0 && (
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        Select All ({formData.userIds.length} of {users.length} selected)
                      </span>
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.userIds.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name} {user.surname}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.username} • {user.userType === 'ADMIN' ? 'Admin' : 'User'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {users.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No users available</p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
} 