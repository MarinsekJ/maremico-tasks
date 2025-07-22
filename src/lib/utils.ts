import { format, isBefore, parseISO } from 'date-fns'

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'dd.MM.yyyy')
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'dd.MM.yyyy HH:mm')
}

export function isTaskOverdue(deadline?: string): boolean {
  if (!deadline) return false
  const deadlineDate = parseISO(deadline)
  const now = new Date()
  return isBefore(deadlineDate, now)
}

export function sortTasksByDeadline(tasks: Array<{ deadline?: string }>): Array<{ deadline?: string }> {
  return tasks.sort((a, b) => {
    // Tasks with no deadline go to the end
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    
    // Sort by deadline (earliest first)
    const dateA = parseISO(a.deadline)
    const dateB = parseISO(b.deadline)
    return dateA.getTime() - dateB.getTime()
  })
}

// Mobile navigation helper to force navigation on mobile devices
export function forceMobileNavigation(url: string): string {
  // Add timestamp to prevent caching issues on mobile
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${Date.now()}`
} 