'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Force navigation on mobile
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          window.location.href = '/dashboard'
        } else {
          router.push('/dashboard')
        }
      } else {
        // Force navigation on mobile
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          window.location.href = '/login'
        } else {
          router.push('/login')
        }
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
