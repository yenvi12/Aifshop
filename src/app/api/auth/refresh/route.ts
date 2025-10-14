import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { generateAccessToken } from '@/lib/auth'

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production-987654321'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any

    // Check if refresh token exists in database and matches hash
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        refreshTokenHash: true
      }
    }) as any

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the incoming refresh token and compare
    const crypto = await import('crypto')
    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    if (incomingHash !== user.refreshTokenHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email, (user as any).role)

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken
    })

  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid or expired refresh token' },
      { status: 401 }
    )
  }
}