import { User, Task as PrismaTask, GroupTask, Group } from '@/generated/prisma'

export type Task = PrismaTask;

export type UserWithGroups = User & {
  groups: {
    group: Group
  }[]
}

export type TaskWithRelations = Task & {
  assignedUser: User | null
  creator: User
  calculatedTimeSum?: number
}

export type GroupTaskWithRelations = GroupTask & {
  group: Group
  activeWorkers: {
    id: string
    userId: string
    startedAt: string
    user: User
  }[]
  timePerUser: {
    user: User
    timeSpent: number
  }[]
  calculatedTimeSum?: number
}

export type GroupWithUsers = Group & {
  users: {
    user: User
  }[]
}

export type AnalyticsData = {
  completedAdminTasks: number
  completedRegularTasks: number
  completedGroupTasks: number
  totalHours: number
  timePerTaskType: {
    admin: number
    regular: number
    group: number
  }
  tasksByType: {
    admin: TaskWithRelations[]
    regular: TaskWithRelations[]
    group: GroupTaskWithRelations[]
  }
}

export type TaskFormData = {
  title: string
  description?: string
  deadline?: string
  assignedUserId?: string
  groupId?: string
}

export type UserFormData = {
  name: string
  surname: string
  email: string
  password: string
  userType: 'ADMIN' | 'REGULAR_USER'
  groupIds: string[]
}

export type GroupFormData = {
  name: string
  description?: string
  color: string
  userIds: string[]
} 