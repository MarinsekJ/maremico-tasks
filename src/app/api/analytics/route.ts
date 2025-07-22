import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const targetUserId = userId || decoded.id

    // Regular users can only view their own analytics
    if (decoded.userType === 'REGULAR_USER' && userId && userId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startDate = new Date(parseInt(year || new Date().getFullYear().toString()), 
                              parseInt(month || (new Date().getMonth() + 1).toString()) - 1, 1)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

    // Get completed tasks
    const completedTasks = await prisma.task.findMany({
      where: {
        assignedUserId: targetUserId,
        status: 'COMPLETED',
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        assignedUser: true,
        creator: true
      }
    })

    // Get completed group tasks
    const userGroups = await prisma.userGroup.findMany({
      where: { userId: targetUserId },
      select: { groupId: true }
    })
    const groupIds = userGroups.map(ug => ug.groupId)

    const completedGroupTasks = await prisma.groupTask.findMany({
      where: {
        groupId: { in: groupIds },
        status: 'COMPLETED',
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        group: true,
        timePerUser: {
          include: {
            user: true
          }
        }
      }
    })

    // Get user creation year
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { createdAt: true }
    })
    
    const userCreatedYear = user ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()
    
    // Get all years where user has tasks
    const allUserTasks = await prisma.task.findMany({
      where: { assignedUserId: targetUserId },
      select: { createdAt: true, updatedAt: true }
    })
    
    const allUserGroupTasks = await prisma.groupTask.findMany({
      where: {
        groupId: { in: groupIds }
      },
      select: { createdAt: true, updatedAt: true }
    })
    
    // Collect all years from task creation and completion dates
    const taskYears = new Set<number>()
    allUserTasks.forEach(task => {
      taskYears.add(new Date(task.createdAt).getFullYear())
      taskYears.add(new Date(task.updatedAt).getFullYear())
    })
    
    allUserGroupTasks.forEach(task => {
      taskYears.add(new Date(task.createdAt).getFullYear())
      taskYears.add(new Date(task.updatedAt).getFullYear())
    })
    
    const availableYears = Array.from(taskYears).sort((a, b) => a - b)
    
    // Calculate analytics
    const adminTasks = completedTasks.filter((task: { type: string }) => task.type === 'ADMIN_TASK')
    const regularTasks = completedTasks.filter((task: { type: string }) => task.type === 'REGULAR_TASK')
    
    const totalAdminTime = adminTasks.reduce((sum, task) => sum + task.timeSum, 0)
    const totalRegularTime = regularTasks.reduce((sum, task) => sum + task.timeSum, 0)
    const totalGroupTime = completedGroupTasks.reduce((sum, task) => sum + task.timeSum, 0)
    
    const totalHours = (totalAdminTime + totalRegularTime + totalGroupTime) / 3600

    const analytics = {
      completedAdminTasks: adminTasks.length,
      completedRegularTasks: regularTasks.length,
      completedGroupTasks: completedGroupTasks.length,
      totalHours: Math.round(totalHours * 100) / 100,
      timePerTaskType: {
        admin: Math.round((totalAdminTime / 3600) * 100) / 100,
        regular: Math.round((totalRegularTime / 3600) * 100) / 100,
        group: Math.round((totalGroupTime / 3600) * 100) / 100
      },
      tasksByType: {
        admin: adminTasks.sort((a, b) => b.timeSum - a.timeSum),
        regular: regularTasks.sort((a, b) => b.timeSum - a.timeSum),
        group: completedGroupTasks.sort((a, b) => b.timeSum - a.timeSum)
      },
      userCreatedYear,
      availableYears
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 