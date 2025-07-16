export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}.${year} at ${hours}:${minutes}`
}

export function isTaskOverdue(deadline?: string): boolean {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  const today = new Date()
  
  // Set both dates to start of day for accurate comparison
  const deadlineStartOfDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate())
  const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  return deadlineStartOfDay < todayStartOfDay
}

export function sortTasksByDeadline(tasks: any[]): any[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a.deadline)
    const bOverdue = isTaskOverdue(b.deadline)
    
    // Overdue tasks first
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    // If both are overdue or both are not overdue, sort by deadline
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    
    // Tasks with deadlines come before tasks without deadlines
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    // If neither has a deadline, sort by creation date (newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
} 