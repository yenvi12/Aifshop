import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-server'
import { generateAccessToken, generateRefreshToken, hashRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get Supabase session token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const supabaseToken = authHeader.substring(7)

    // Verify Supabase token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken)
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid Supabase token' },
        { status: 401 }
      )
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    })

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(dbUser.id, dbUser.email, (dbUser as any).role)
    const refreshToken = generateRefreshToken(dbUser.id)

    // Hash refresh token and save to database
    const refreshTokenHash = hashRefreshToken(refreshToken)
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { refreshTokenHash } as any
    })

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: (dbUser as any).role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    })

  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}