import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  hashPassword
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const supabaseToken = authHeader.substring(7);

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid Supabase token' },
        { status: 401 }
      );
    }

    let dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    });

    if (!dbUser) {
      const hashedPassword = await hashPassword(user.email!);

      const metadata = user.user_metadata as {
        given_name?: string;
        family_name?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        picture?: string;
        avatar_url?: string;
      };

      let firstName = metadata?.given_name || metadata?.first_name || '';
      let lastName = metadata?.family_name || metadata?.last_name || '';
      const avatar = metadata?.picture || metadata?.avatar_url || null;

      if (!firstName && !lastName && metadata?.name) {
        const nameParts = metadata.name.trim().split(' ');
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = metadata.name;
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
      });
    }

    const accessToken = generateAccessToken(
      dbUser.id,
      dbUser.email,
      dbUser.role,
      dbUser.supabaseUserId ?? undefined
    );

    const refreshToken = generateRefreshToken(dbUser.id);
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { refreshTokenHash }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
