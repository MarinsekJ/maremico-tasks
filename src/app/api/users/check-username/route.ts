import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    return NextResponse.json({ 
      isUnique: !existingUser,
      exists: !!existingUser 
    })
  } catch (error) {
    console.error('Error checking username:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 