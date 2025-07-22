'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Group {
  id: string
  name: string
  description?: string
  color: string
}

export default function CreateUserPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'REGULAR_USER' as 'ADMIN' | 'REGULAR_USER',
    groupIds: [] as string[]
  })

  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/admin/users/create')}`)
        return
      }
      
      if (user?.userType !== 'ADMIN') {
        router.push('/dashboard')
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

  const checkUsernameUniqueness = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
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
  }, [])

  const generateUniqueUsername = useCallback(async (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return

    const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '')
    
    // First try the base username
    const checkBase = await fetch('/api/users/check-username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: baseUsername })
    })

    if (checkBase.ok) {
      const baseData = await checkBase.json()
      if (baseData.isUnique) {
        setFormData(prev => ({ ...prev, username: baseUsername }))
        return
      }
    }

    // If base username exists, try with numbers
    let counter = 1
    let found = false
    
    while (!found && counter <= 100) { // Limit to prevent infinite loop
      const usernameWithNumber = `${baseUsername}${counter}`
      
      const response = await fetch('/api/users/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: usernameWithNumber })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isUnique) {
          setFormData(prev => ({ ...prev, username: usernameWithNumber }))
          found = true
        }
      }
      
      counter++
    }

    if (!found) {
      // If we couldn't find a unique username, just use the base with a timestamp
      const timestamp = Date.now().toString().slice(-4)
      setFormData(prev => ({ ...prev, username: `${baseUsername}${timestamp}` }))
    }
  }, [])

  const validatePasswords = useCallback(() => {
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
    } else {
      setPasswordError('')
    }
  }, [formData.password, formData.confirmPassword])

  // Check username uniqueness when username changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsernameUniqueness(formData.username)
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [formData.username, checkUsernameUniqueness])

  // Validate passwords when either password field changes
  useEffect(() => {
    validatePasswords()
  }, [validatePasswords])

  // Generate username when first name or last name changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateUniqueUsername(formData.name, formData.surname)
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [formData.name, formData.surname, generateUniqueUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    // Check if username has error
    if (usernameError) {
      return
    }

    setLoading(true)

    try {
      const userData = {
        name: formData.name,
        surname: formData.surname,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
        groupIds: formData.groupIds
      }
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        router.push('/admin/users')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user')
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Users
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
          <p className="mt-2 text-gray-600">Add a new user to the system</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
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
                    Username <span className="text-xs text-gray-500">(auto-generated)</span>
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
                      placeholder="Auto-generated from name"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pr-10 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
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
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full pr-10 px-4 py-2 border text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm password"
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

            {/* Role */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Permissions</h3>
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
            </div>

            {/* Groups */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Groups</h3>
              <div className="space-y-3">
                {groups.map((group) => (
                  <label key={group.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.groupIds.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: group.color }}
                      ></div>
                      <span className="text-sm text-gray-700">{group.name}</span>
                      {group.description && (
                        <span className="text-sm text-gray-500 ml-2">({group.description})</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 