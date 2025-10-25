import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789';

// ✅ JWT Payload interface
interface AdminJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ✅ If you have role enum, this would be even better:
// import { Role } from '@prisma/client'; then use: role: Role.ADMIN

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;

      if (decoded.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { userId }: { userId?: string } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }, // ✅ Không cần ép kiểu, Prisma sẽ kiểm tra
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} is now an admin`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role, // ✅ Không cần ép kiểu
      },
    });
  } catch (error: unknown) {
    console.error('Set admin error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
