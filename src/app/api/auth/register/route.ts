import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-server'
import { registerSchema } from '@/lib/validation'
import { generateTransactionId } from '@/lib/auth'
import { storeRegistrationData } from '@/lib/tempStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = registerSchema.safeParse(body)
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

    const { firstName, lastName, email, phoneNumber, dateOfBirth, password } = validationResult.data

    // Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered'
        },
        { status: 409 }
      )
    }

    // Tạo transaction ID
    const transactionId = generateTransactionId()

    // Lưu thông tin đăng ký tạm thời
    await storeRegistrationData(transactionId, {
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      password
    })

    // Gửi OTP qua Supabase (server-side)
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true
      }
    })

    if (otpError) {
      return NextResponse.json(
        {
          success: false,
          error: otpError.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      transactionId,
      expiresIn: 600 // 10 minutes in seconds
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}