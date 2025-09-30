import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-server'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'send-otp') {
      const { email } = body

      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Invalid email address' },
          { status: 400 }
        )
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.trim() }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Email not found' },
          { status: 404 }
        )
      }

      // Send password reset email via Supabase
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim())

      if (resetError) {
        return NextResponse.json(
          { success: false, error: resetError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email'
      })

    } else if (action === 'verify-otp') {
      const { email, otp } = body

      if (!email || !otp) {
        return NextResponse.json(
          { success: false, error: 'Email and OTP are required' },
          { status: 400 }
        )
      }

      if (otp.length !== 6) {
        return NextResponse.json(
          { success: false, error: 'Invalid OTP' },
          { status: 400 }
        )
      }

      // Verify OTP with Supabase
      const { data, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery'
      })

      if (verifyError || !data.user) {
        return NextResponse.json(
          { success: false, error: 'Invalid OTP' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully'
      })

    } else if (action === 'reset') {
      const { email, newPassword, confirmPassword } = body

      if (!email || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'All fields are required' },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Passwords do not match' },
          { status: 400 }
        )
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.trim() }
      })

      if (!user || !user.supabaseUserId) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      // Update password in Supabase
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseUserId, {
        password: newPassword
      })

      if (updateError) {
        console.error('Failed to update password:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update password' },
          { status: 500 }
        )
      }

      // Update password in Prisma
      const hashedPassword = await hashPassword(newPassword)

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset successful'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}