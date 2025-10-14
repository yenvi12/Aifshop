import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789';

// Helper function to verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 };
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'ADMIN') {
      return { error: 'Admin access required', status: 403 };
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 };
  }
}

// Helper function to get today's date range in UTC for UTC+7 timezone
function getTodayRangeUTC() {
  const now = new Date();
  // Add 7 hours for UTC+7
  const localNow = new Date(now.getTime() + 7 * 60 * 60000);
  // Start of day in local time
  const startLocal = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
  // Convert back to UTC
  const startUTC = new Date(startLocal.getTime() - 7 * 60 * 60000);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startUTC, endUTC };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    // Calculate stats in parallel for better performance
    const [totalProducts, totalUsers, totalOrders, ordersToday, pendingOrders] = await Promise.all([
      // Total active products
      prisma.product.count({
        where: { isActive: true }
      }),

      // Total users (from Supabase Auth)
      (async () => {
        const { data: supabaseUsers, error } = await (await import('@/lib/supabase-server')).supabaseAdmin.auth.admin.listUsers();
        if (error) {
          console.error('Failed to fetch users:', error);
          return 0;
        }
        return supabaseUsers.users.filter(user => user.email).length;
      })(),

      // Total orders
      prisma.order.count(),

      // Orders today
      (async () => {
        const { startUTC, endUTC } = getTodayRangeUTC();
        return prisma.order.count({
          where: {
            createdAt: {
              gte: startUTC,
              lt: endUTC
            }
          }
        });
      })(),

      // Pending orders
      prisma.order.count({
        where: { status: 'ORDERED' }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        ordersToday,
        pendingOrders
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}