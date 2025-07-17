'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  surname: string
  email: string
  username: string
  userType: 'ADMIN' | 'REGULAR_USER'
  groups: any[]
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string, redirectTo?: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user is already logged in
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string, redirectTo?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        
        // Force page reload on mobile to ensure proper navigation
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          window.location.href = redirectTo || '/dashboard'
          return true
        }
        
        return true
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ user: null, login, logout, loading: true, isAuthenticated: false }}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 