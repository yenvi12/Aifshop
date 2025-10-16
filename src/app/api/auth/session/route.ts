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
    let dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    })

    // If user doesn't exist in database but exists in Supabase (e.g., Google login),
    // create the database record automatically
    if (!dbUser) {
      const { hashPassword } = await import('@/lib/auth')
      const hashedPassword = await hashPassword(user.email!) // Use email as dummy password for OAuth users

      // Extract profile information from OAuth provider metadata
      const metadata = user.user_metadata
      let firstName = metadata?.given_name || metadata?.first_name || ''
      let lastName = metadata?.family_name || metadata?.last_name || ''
      const avatar = metadata?.picture || metadata?.avatar_url || null

      // For Google OAuth, name might be in full name format
      if (!firstName && !lastName && metadata?.name) {
        const nameParts = metadata.name.trim().split(' ')
        if (nameParts.length > 1) {
          firstName = nameParts[0]
          lastName = nameParts.slice(1).join(' ')
        } else {
          firstName = metadata.name
        }
      }

      dbUser = await prisma.user.create({
        data: {
          supabaseUserId: user.id,
          email: user.email!,
          firstName,
          lastName,
          avatar,
          dateOfBirth: new Date('2000-01-01'),
          password: hashedPassword,
          isVerified: true,
          role: 'USER'
        }
      })
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(dbUser.id, dbUser.email, (dbUser as any).role, dbUser.supabaseUserId || undefined)
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