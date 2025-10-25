import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import { otpVerificationSchema } from '@/lib/validation';
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken
} from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import {
  getRegistrationData,
  removeRegistrationData
} from '@/lib/tempStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = otpVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { transactionId, otp } = validationResult.data;

    const registrationData = await getRegistrationData(transactionId);
    if (!registrationData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired transaction ID'
        },
        { status: 400 }
      );
    }

    const { data, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      email: registrationData.email,
      token: otp,
      type: 'email'
    });

    if (verifyError || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP'
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      password: registrationData.password
    });

    if (updateError) {
      console.error('Failed to set user password:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set user password'
        },
        { status: 500 }
      );
    }

    const hashedPassword = await hashPassword(registrationData.password);

    const user = await prisma.user.create({
      data: {
        supabaseUserId: data.user.id,
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phoneNumber: registrationData.phoneNumber,
        dateOfBirth: registrationData.dateOfBirth,
        password: hashedPassword,
        isVerified: true,
        role: 'USER'
      }
    });

    await removeRegistrationData(transactionId);

    const accessToken: string = generateAccessToken(
      user.id,
      user.email,
      'USER',
      user.supabaseUserId ?? undefined
    );

    const refreshToken: string = generateRefreshToken(user.id);
    const hashedRefreshToken: string = hashRefreshToken(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefreshToken }
    });

    sendWelcomeEmail(user.email, user.firstName, user.lastName).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
