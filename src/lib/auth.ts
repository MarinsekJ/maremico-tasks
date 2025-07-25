import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../generated/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JwtPayload {
  id: string;
  email: string;
  userType: 'ADMIN' | 'REGULAR_USER';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
} 