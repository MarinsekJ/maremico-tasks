import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, hashPassword } from '@/lib/auth'

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

    // Only admins can view all users
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        groups: {
          include: {
            group: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create users
    if (decoded.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, surname, username, email, password, userType, groupIds } = await request.json()

    if (!name || !surname || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Name, surname, username, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        surname,
        username,
        email,
        password: hashedPassword,
        userType: userType || 'REGULAR_USER'
      },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    })

    // Add user to groups if specified
    if (groupIds && groupIds.length > 0) {
      // Validate that all groupIds exist
      const existingGroups = await prisma.group.findMany({
        where: {
          id: {
            in: groupIds
          }
        },
        select: { id: true }
      })

      const existingGroupIds = existingGroups.map(group => group.id)
      const invalidGroupIds = groupIds.filter((id: string) => !existingGroupIds.includes(id))

      if (invalidGroupIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid group IDs: ${invalidGroupIds.join(', ')}` },
          { status: 400 }
        )
      }

      await prisma.userGroup.createMany({
        data: groupIds.map((groupId: string) => ({
          userId: user.id,
          groupId
        }))
      })
    }

    // Fetch the created user with groups
    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    })

    return NextResponse.json(createdUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 