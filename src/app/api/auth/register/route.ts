import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema, type RegisterInput } from '@/lib/validation'
import { generateOTP, hashOTP, generateTransactionId } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'
import { checkOTPSendLimit } from '@/lib/rateLimit'
import { storeRegistrationData } from '@/lib/tempStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Register request body:', JSON.stringify(body, null, 2)) // Debug log

    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      console.log('Validation errors:', validationResult.error.format())
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
    console.log('Validation passed, processing registration...')

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

    // Rate limit kiểm tra
    const rateLimit = await checkOTPSendLimit(email)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          retryAfter: rateLimit.remainingTime
        },
        { status: 429 }
      )
    }

    // Tạo transaction ID
    const transactionId = generateTransactionId()

    // Tạo OTP
    const otp = generateOTP()
    const { hash: hashedOtp, salt } = hashOTP(otp)

    // Lưu OTP vào DB với expiry 10 phút (điều chỉnh timezone cho Việt Nam)
    const now = new Date()
    const vietnamOffset = 7 * 60 * 60 * 1000 // +7 hours in milliseconds
    const expiresAt = new Date(now.getTime() + vietnamOffset + 10 * 60 * 1000) // 10 minutes from now in Vietnam time

    await prisma.otp.create({
      data: {
        email,
        hashedOtp,
        salt,
        expiresAt
      }
    })

    // Lưu thông tin đăng ký tạm thời
    console.log(`Storing registration data for transactionId: ${transactionId}`)
    await storeRegistrationData(transactionId, {
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      password // Chưa hash, sẽ hash khi verify thành công
    })

    // Gửi OTP email bất đồng bộ
    sendOTPEmail(email, otp).catch(error => {
      console.error('Failed to send OTP email:', error)
      // Note: Chúng ta không trả về lỗi ở đây vì OTP đã được lưu trong DB
      // User có thể yêu cầu gửi lại nếu email không đến
    })

    // OTP sent via email only

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