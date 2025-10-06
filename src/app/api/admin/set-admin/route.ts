import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// This is a temporary endpoint to set admin role - remove in production
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      if (decoded.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' } as any
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.email} is now an admin`,
      user: {
        id: user.id,
        email: user.email,
        role: (user as any).role
      }
    })

  } catch (error) {
    console.error('Set admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}