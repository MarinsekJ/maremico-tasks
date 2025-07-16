import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupTaskId } = await params

    // First check if the group task exists and user has access to it
    const groupTask = await prisma.groupTask.findUnique({
      where: { id: groupTaskId },
      include: {
        group: {
          include: {
            users: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!groupTask) {
      return NextResponse.json({ error: 'Group task not found' }, { status: 404 })
    }

    // Check if user has access to this group task
    const userInGroup = groupTask.group.users.some(ug => ug.userId === decoded.id)
    if (decoded.userType === 'REGULAR_USER' && !userInGroup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch task logs - search by taskType and groupTaskId
    const logs = await prisma.taskLog.findMany({
      where: {
        AND: [
          { taskType: 'GROUP_TASK' },
          { groupTaskId: groupTaskId }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching group task logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 