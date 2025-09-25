import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Lấy refresh token từ header hoặc body
    const authHeader = request.headers.get('authorization')
    const refreshToken = authHeader?.replace('Bearer ', '') ||
                        (await request.json().catch(() => ({}))).refreshToken

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token required'
        },
        { status: 401 }
      )
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, 'refresh')
    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refresh token'
        },
        { status: 401 }
      )
    }

    // Tạo access token mới
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email || '')

    // Có thể tạo refresh token mới để rotate (tùy chọn)
    // const newRefreshToken = generateRefreshToken(decoded.userId)

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        // refreshToken: newRefreshToken, // Uncomment nếu muốn rotate refresh token
        accessTokenExpiresIn: 900 // 15 minutes
      }
    })

  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}