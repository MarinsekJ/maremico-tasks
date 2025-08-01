'use client'

import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface NotificationProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose?: () => void
}

export default function Notification({ 
  message, 
  type = 'success', 
  duration = 2000, 
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    console.log(`[DEBUG] Notification: Showing "${message}" for ${duration}ms`)
    
    const timer = setTimeout(() => {
      console.log(`[DEBUG] Notification: Hiding "${message}"`)
      setIsVisible(false)
      
      const cleanupTimer = setTimeout(() => {
        console.log(`[DEBUG] Notification: Calling onClose for "${message}"`)
        onClose?.()
      }, 300) // Wait for fade out animation
      
      return () => clearTimeout(cleanupTimer)
    }, duration)

    return () => {
      console.log(`[DEBUG] Notification: Cleaning up timer for "${message}"`)
      clearTimeout(timer)
    }
  }, [duration, onClose, message])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      case 'info':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-green-500 text-white'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'error':
        return <div className="h-5 w-5">✕</div>
      case 'info':
        return <div className="h-5 w-5">ℹ</div>
      default:
        return <CheckCircle className="h-5 w-5" />
    }
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-12'
      } ${getTypeStyles()}`}
    >
      {getIcon()}
      <span className="font-medium">{message}</span>
      <button
        onClick={() => {
          console.log(`[DEBUG] Notification: Manual close for "${message}"`)
          setIsVisible(false)
          setTimeout(() => onClose?.(), 300)
        }}
        className="ml-2 text-white hover:text-gray-200 transition-colors"
      >
        ✕
      </button>
    </div>
  )
} 