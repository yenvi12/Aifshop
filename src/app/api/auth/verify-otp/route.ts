import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { otpVerificationSchema, type OtpVerificationInput } from '@/lib/validation'
import { verifyOTP, hashPassword, generateAccessToken, generateRefreshToken, hashRefreshToken } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { checkOTPVerifyLimit } from '@/lib/rateLimit'
import { getRegistrationData, removeRegistrationData } from '@/lib/tempStore'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Verify OTP request:', JSON.stringify(body, null, 2))

    // Validate input
    const validationResult = otpVerificationSchema.safeParse(body)
    if (!validationResult.success) {
      console.log('OTP validation errors:', validationResult.error.format())
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const { transactionId, otp } = validationResult.data

    // Rate limit kiểm tra
    const rateLimit = await checkOTPVerifyLimit(transactionId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification attempts. Please try again later.',
          retryAfter: rateLimit.remainingTime
        },
        { status: 429 }
      )
    }

    // Lấy thông tin đăng ký từ temp store
    console.log('Getting registration data for transactionId:', transactionId)
    const registrationData = await getRegistrationData(transactionId)
    console.log('Registration data found:', !!registrationData)
    if (!registrationData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired transaction ID'
        },
        { status: 400 }
      )
    }

    // Tìm OTP trong database
    console.log(`Looking for OTP record with email: ${registrationData.email}`)
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email: registrationData.email,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc' // Lấy OTP mới nhất
      }
    })

    

    console.log(`OTP record found:`, otpRecord ? {
      id: otpRecord.id,
      email: otpRecord.email,
      isUsed: otpRecord.isUsed,
      expiresAt: otpRecord.expiresAt,
      hashedOtp: otpRecord.hashedOtp.substring(0, 20) + '...'
    } : 'null')

    if (!otpRecord) {
      // Check if there are any OTP records for this email
     const allRecords = await prisma.otp.findMany({
  where: { email: registrationData.email },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: {
    id: true,
    isUsed: true,
    expiresAt: true,
    createdAt: true,
  },
});

console.log(`All OTP records for ${registrationData.email}:`,allRecords.map((r) => ({
    id: r.id,
    isUsed: r.isUsed,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }))
);

      return NextResponse.json(
        {
          success: false,
          error: 'OTP invalid or expired'
        },
        { status: 400 }
      )
    }

    // Verify OTP
    console.log(`Verifying OTP: input=${otp}, stored_hash=${otpRecord.hashedOtp.substring(0, 20)}..., salt=${otpRecord.salt}`)
    const isValidOTP = verifyOTP(otp, otpRecord.hashedOtp, otpRecord.salt)
    console.log(`OTP verification result: ${isValidOTP}`)
    if (!isValidOTP) {
      return NextResponse.json(
        {
          success: false,
          error: 'OTP invalid'
        },
        { status: 400 }
      )
    }

    // OTP hợp lệ - tạo tài khoản user
    const hashedPassword = await hashPassword(registrationData.password)

    const user = await prisma.user.create({
      data: {
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phoneNumber: registrationData.phoneNumber,
        dateOfBirth: registrationData.dateOfBirth,
        password: hashedPassword,
        isVerified: true
      }
    })

    // Đánh dấu OTP là đã sử dụng
    console.log(`Marking OTP ${otpRecord.id} as used`)
    const updateResult = await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    })
    console.log(`OTP update result:`, updateResult)

    // Xóa dữ liệu đăng ký tạm thời
    console.log(`Removing temp data for transactionId: ${transactionId}`)
    await removeRegistrationData(transactionId)

    // Tạo JWT tokens
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id)
    const hashedRefreshToken = hashRefreshToken(refreshToken)

    // Lưu hashed refresh token trong database (có thể mở rộng model User để lưu)
    // Hiện tại chúng ta sẽ lưu trong memory hoặc có thể thêm field vào User model

    // Gửi welcome email bất đồng bộ
    sendWelcomeEmail(user.email, user.firstName, user.lastName).catch(error => {
      console.error('Failed to send welcome email:', error)
      // Không trả về lỗi vì user đã được tạo thành công
    })

    // Log audit
    console.log(`User registered successfully: ${user.email} at ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
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
    console.error('OTP verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    )
  }
}