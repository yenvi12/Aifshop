import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loginSchema, type LoginInput } from '@/lib/validation'
import { verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken } from '@/lib/auth'
import { checkLoginLimit, resetLoginLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const body: LoginInput = await request.json()

    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Rate limit kiểm tra
    const rateLimit = await checkLoginLimit(email)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimit.remainingTime
        },
        { status: 429 }
      )
    }

    // Tìm user theo email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Login thành công - reset rate limit counter
    resetLoginLimit(email)

    // Kiểm tra user đã verify email chưa
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please verify your email before logging in'
        },
        { status: 403 }
      )
    }

    // Tạo JWT tokens
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id)
    const hashedRefreshToken = hashRefreshToken(refreshToken)

    // Log audit
    console.log(`User logged in: ${user.email} at ${new Date().toISOString()}`)

    // Trả về tokens (có thể set httpOnly cookie thay vì trả về client)
    // Hiện tại trả về client để đơn giản
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: 900, // 15 minutes
        refreshTokenExpiresIn: 604800 // 7 days
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}