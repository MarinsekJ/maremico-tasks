'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, User, Mail, Eye, EyeOff, Save, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { formatDate } from '@/lib/utils'

interface Group {
  id: string
  name: string
  description?: string
  color: string
}

interface UserData {
  id: string
  name: string
  surname: string
  username: string
  email: string
  userType: 'ADMIN' | 'REGULAR_USER'
  isActive: boolean
  createdAt: string
  updatedAt: string
  groups: {
    id: string
    name: string
    color: string
  }[]
}

export default function EditUserPage() {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'REGULAR_USER' as 'ADMIN' | 'REGULAR_USER',
    isActive: true,
    groupIds: [] as string[]
  })

  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  const isAdmin = currentUser?.userType === 'ADMIN'
  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/admin/users/${userId}`)}`)
        return
      }
      
      // Allow access if user is admin OR if user is editing their own profile
      if (!isAdmin && !isOwnProfile) {
        router.push('/dashboard')
        return
      }
      
      fetchUserData()
      fetchGroups()
    }
  }, [isAuthenticated, authLoading, currentUser, router, userId, isAdmin, isOwnProfile])

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
        setFormData({
          name: data.name,
          surname: data.surname,
          username: data.username,
          email: data.email,
          password: '',
          confirmPassword: '',
          userType: data.userType,
          isActive: data.isActive,
          groupIds: data.groups.map((group: any) => group.id)
        })
      } else {
        router.push('/admin/users')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

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

  const checkUsernameUniqueness = async (username: string, currentUsername?: string) => {
    if (!username || username.length < 3) {
      setUsernameError('')
      return
    }

    // If username hasn't changed, no need to check
    if (currentUsername && username === currentUsername) {
      setUsernameError('')
      return
    }

    setIsCheckingUsername(true)
    try {
      const response = await fetch('/api/users/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.isUnique) {
          setUsernameError('Username already exists')
        } else {
          setUsernameError('')
        }
      }
    } catch (error) {
      console.error('Error checking username:', error)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const validatePasswords = () => {
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
    } else {
      setPasswordError('')
    }
  }

  // Check username uniqueness when username changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsernameUniqueness(formData.username, userData?.username)
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [formData.username, userData?.username])

  // Validate passwords when either password field changes
  useEffect(() => {
    validatePasswords()
  }, [formData.password, formData.confirmPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match if password is being changed
    if (formData.password && formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    // Check if username has error
    if (usernameError) {
      return
    }

    setSaving(true)

    try {
      const updateData: any = {
        name: formData.name,
        surname: formData.surname,
        username: formData.username,
        email: formData.email,
        userType: formData.userType,
        isActive: formData.isActive,
        groupIds: formData.groupIds
      }

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setIsEditing(false)
        fetchUserData() // Refresh user data
        // Clear password fields
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId]
    }))
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

  if (!isAuthenticated || (!isAdmin && !isOwnProfile) || !userData) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            {isOwnProfile ? 'Back to Profile' : 'Back to Users'}
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isOwnProfile 
                ? (isEditing ? 'Edit Profile' : 'My Profile') 
                : (isEditing ? `Edit User ${formData.name}` : `Details of ${formData.name}`)
              }
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing 
                ? (isOwnProfile ? 'Update your profile information' : 'Update user information')
                : (isOwnProfile ? 'View your profile information' : 'View user information')
              }
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter first name"
                      />
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="surname"
                        required
                        value={formData.surname}
                        onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter last name"
                      />
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="username"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className={`w-full pl-10 pr-4 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          usernameError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter username"
                        minLength={3}
                      />
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      {isCheckingUsername && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {usernameError && (
                      <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                    )}
                    {formData.username && !usernameError && !isCheckingUsername && (
                      <p className="mt-1 text-sm text-green-600">✓ Username is available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
                <p className="text-sm text-gray-600 mb-4">Leave password fields empty to keep current password</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pr-10 px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`w-full pr-10 px-4 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          passwordError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Confirm new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Role & Status - Admin Only */}
              {isAdmin && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Status</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-1">
                        User Type
                      </label>
                      <select
                        id="userType"
                        value={formData.userType}
                        onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value as 'ADMIN' | 'REGULAR_USER' }))}
                        className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="REGULAR_USER">Regular User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Groups Management - Admin Only and Only During Editing */}
              {isAdmin && isEditing && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Groups</h3>
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const isCurrentMember = formData.groupIds.includes(group.id)
                      return (
                        <label key={group.id} className={`flex items-center p-2 rounded-lg border ${
                          isCurrentMember ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isCurrentMember}
                            onChange={() => handleGroupToggle(group.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex items-center flex-1">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: group.color }}
                            ></div>
                            <span className="text-sm text-gray-700">{group.name}</span>
                            {group.description && (
                              <span className="text-sm text-gray-500 ml-2">({group.description})</span>
                            )}
                          </div>
                          {isCurrentMember && (
                            <span className="text-xs text-blue-600 font-medium">Current Member</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Check the boxes above to add this user to groups. Uncheck to remove from groups.
                    </p>
                    <p className="text-xs text-gray-500">
                      Current groups: {formData.groupIds.length} | Available groups: {groups.length}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    // Reset form data to original values
                    if (userData) {
                      setFormData({
                        name: userData.name,
                        surname: userData.surname,
                        username: userData.username,
                        email: userData.email,
                        password: '',
                        confirmPassword: '',
                        userType: userData.userType,
                        isActive: userData.isActive,
                        groupIds: userData.groups.map(group => group.id)
                      })
                    }
                    setUsernameError('')
                    setPasswordError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <p className="text-gray-900">{userData.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <p className="text-gray-900">{userData.surname}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <p className="text-gray-900">{userData.username}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <p className="text-gray-900">{userData.email}</p>
                </div>
              </div>

              {/* Role & Status - Admin Only */}
              {isAdmin && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Status</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.userType === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userData.userType === 'ADMIN' ? 'Admin' : 'Regular User'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Groups */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Groups</h3>
                <div className="flex flex-wrap gap-2">
                  {userData.groups && userData.groups.length > 0 ? (
                    userData.groups.map((group) => (
                      <span
                        key={group.id}
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: `${group.color}20`,
                          color: group.color
                        }}
                      >
                        {group.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No groups assigned</p>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{formatDate(userData.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{formatDate(userData.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-0 left-0 right-0 border-t border-gray-200 p-4">
        <button
          onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <User className="h-5 w-5" />
          {isOwnProfile ? 'Edit Profile' : 'Edit User'}
        </button>
      </div>
    </DashboardLayout>
  )
} 