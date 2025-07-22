import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JwtPayload } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as JwtPayload | null
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view individual groups
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as JwtPayload | null
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update groups
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, userIds } = body

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if name is being changed and if it already exists
    if (name && name !== existingGroup.name) {
      const nameExists = await prisma.group.findUnique({
        where: { name }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'Group with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: { name?: string; description?: string | null; color?: string } = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (color) updateData.color = color

    await prisma.group.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    })

    // Update users if specified
    if (userIds !== undefined) {
      // Remove all existing user associations
      await prisma.userGroup.deleteMany({
        where: { groupId: id }
      })

      // Add new user associations
      if (userIds.length > 0) {
        // Validate that all userIds exist
        const existingUsers = await prisma.user.findMany({
          where: {
            id: {
              in: userIds
            }
          },
          select: { id: true }
        })

        const existingUserIds = existingUsers.map(user => user.id)
        const invalidUserIds = userIds.filter((userId: string) => !existingUserIds.includes(userId))

        if (invalidUserIds.length > 0) {
          return NextResponse.json(
            { error: `Invalid user IDs: ${invalidUserIds.join(', ')}` },
            { status: 400 }
          )
        }

        await prisma.userGroup.createMany({
          data: userIds.map((userId: string) => ({
            userId,
            groupId: id
          }))
        })
      }
    }

    // Fetch updated group with users
    const updatedGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as JwtPayload | null
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete groups
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Delete the group (cascade will handle user associations and group tasks)
    await prisma.group.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 