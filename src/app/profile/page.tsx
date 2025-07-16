'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Calendar, Shield, Users, Clock, Edit } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { formatDate } from '@/lib/utils'

interface Group {
  id: string
  name: string
  description: string
  color: string
}

interface UserGroup {
  id: string
  group: Group
}

interface UserWithGroups {
  id: string
  name: string
  surname: string
  email: string
  username: string
  userType: 'ADMIN' | 'REGULAR_USER'
  isActive: boolean
  createdAt: string
  updatedAt: string
  groups: UserGroup[]
}

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [userData, setUserData] = useState<UserWithGroups | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirectTo=${encodeURIComponent('/profile')}`)
        return
      }
      
      fetchUserData()
    }
  }, [isAuthenticated, authLoading, user, router])

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users/${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
            <p className="text-gray-600">Unable to load user information.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">
            View and manage your account information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 w-full max-w-5xl">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-center mb-6">
                <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">
                    {userData.name.charAt(0).toUpperCase()}{userData.surname.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {userData.name} {userData.surname}
                </h2>
                <p className="text-gray-600">@{userData.username}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.userType === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {userData.userType === 'ADMIN' ? 'Administrator' : 'Regular User'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{userData.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Member Since</p>
                    <p className="text-sm text-gray-600">{formatDate(userData.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-600">{formatDate(userData.updatedAt)}</p>
                  </div>
                </div>

                {/* Edit Profile Button */}
                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/admin/users/${userData.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Groups and Additional Info */}
          <div className="lg:col-span-2">
            {/* Groups */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">My Groups</h3>
              </div>
              
              {userData.groups.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {userData.groups.map((userGroup) => (
                    <div
                      key={userGroup.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div 
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: userGroup.group.color }}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">{userGroup.group.name}</p>
                        {userGroup.group.description && (
                          <p className="text-sm text-gray-600">{userGroup.group.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You are not a member of any groups yet.</p>
                </div>
              )}
            </div>

            {/* Account Statistics (placeholder for future features) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Total Tasks</p>
                      <p className="text-2xl font-bold text-blue-600">-</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">C</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Completed</p>
                      <p className="text-2xl font-bold text-green-600">-</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Statistics feature coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 