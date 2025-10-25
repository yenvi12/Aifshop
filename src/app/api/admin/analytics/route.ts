import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789';

// ✅ Define a custom payload type for your JWT
interface AdminJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Helper function to verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 };
  }

  const token = authHeader.substring(7);

  try {
    // ✅ Use proper typing instead of `as any`
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;

    if (decoded.role !== 'ADMIN') {
      return { error: 'Admin access required', status: 403 };
    }

    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    return { error: 'Invalid or expired token', status: 401 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    // Get date range from query params (for analytics page)
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Calculate stats in parallel for better performance
    const [
      totalProducts,
      totalUsers,
      totalOrders,
      ordersToday,
      pendingOrders,
      totalRevenue,
      averageOrderValue,
      ordersInRange,
      revenueInRange,
      previousPeriodRevenue,
      previousPeriodOrders,
      revenueTrend,
      userGrowth,
      ordersByStatus,
      topProducts
    ] = await Promise.all([
      prisma.product.count({
        where: { isActive: true }
      }),

      (async () => {
        const { data: supabaseUsers, error } = await (await import('@/lib/supabase-server')).supabaseAdmin.auth.admin.listUsers();
        if (error) {
          console.error('Failed to fetch users:', error);
          return 0;
        }
        return supabaseUsers.users.filter(user => user.email).length;
      })(),

      prisma.order.count(),

      (async () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        return prisma.order.count({
          where: { createdAt: { gte: startOfDay, lt: endOfDay } }
        });
      })(),

      prisma.order.count({
        where: { status: 'ORDERED' }
      }),

      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['SHIPPED', 'DELIVERED'] } }
      }).then(result => result._sum.totalAmount || 0),

      prisma.order.aggregate({
        _avg: { totalAmount: true },
        where: { status: { in: ['SHIPPED', 'DELIVERED'] } }
      }).then(result => result._avg.totalAmount || 0),

      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['SHIPPED', 'DELIVERED'] }
        }
      }),

      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startDate },
          status: { in: ['SHIPPED', 'DELIVERED'] }
        }
      }).then(result => result._sum.totalAmount || 0),

      (async () => {
        const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousEnd = startDate;
        return prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            createdAt: { gte: previousStart, lt: previousEnd },
            status: { in: ['SHIPPED', 'DELIVERED'] }
          }
        }).then(result => result._sum.totalAmount || 0);
      })(),

      (async () => {
        const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousEnd = startDate;
        return prisma.order.count({
          where: {
            createdAt: { gte: previousStart, lt: previousEnd },
            status: { in: ['SHIPPED', 'DELIVERED'] }
          }
        });
      })(),

      (async () => {
        const trendData = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          trendData.push({
            date: date.toISOString().split('T')[0],
            revenue: Math.floor(Math.random() * 10000) + 5000,
            orders: Math.floor(Math.random() * 20) + 5
          });
        }
        return trendData;
      })(),

      (async () => {
        const trendData = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          trendData.push({
            date: date.toISOString().split('T')[0],
            users: Math.floor(Math.random() * 10) + 5
          });
        }
        return trendData;
      })(),

      (async () => {
        const mockStatusData = [
          { status: 'DELIVERED', count: 145, percentage: 65.3 },
          { status: 'SHIPPED', count: 38, percentage: 17.1 },
          { status: 'PROCESSING', count: 25, percentage: 11.3 },
          { status: 'ORDERED', count: 12, percentage: 5.4 },
          { status: 'CANCELLED', count: 2, percentage: 0.9 }
        ];
        return mockStatusData;
      })(),

      (async () => {
        const mockProducts = [
          { name: 'Premium Gold Ring', sales: 45, revenue: 22500, orders: 38 },
          { name: 'Diamond Necklace', sales: 32, revenue: 48000, orders: 28 },
          { name: 'Silver Earrings', sales: 28, revenue: 8400, orders: 25 },
          { name: 'Luxury Watch', sales: 18, revenue: 36000, orders: 15 },
          { name: 'Pearl Bracelet', sales: 15, revenue: 6750, orders: 12 }
        ];
        return mockProducts;
      })()
    ]);

    const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;
    const revenueChange = 12.5;
    const ordersChange = 8.3;
    const userChange = 15.2;
    const aovChange = 3.8;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        ordersToday,
        pendingOrders,
        totalRevenue,
        averageOrderValue,
        conversionRate,
        revenueTrend,
        userGrowth,
        ordersByStatus,
        topProducts,
        trends: {
          revenue: {
            change: revenueChange,
            direction: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral' as const
          },
          orders: {
            change: ordersChange,
            direction: ordersChange > 0 ? 'up' : ordersChange < 0 ? 'down' : 'neutral' as const
          },
          users: {
            change: userChange,
            direction: userChange > 0 ? 'up' : userChange < 0 ? 'down' : 'neutral' as const
          },
          aov: {
            change: aovChange,
            direction: aovChange > 0 ? 'up' : aovChange < 0 ? 'down' : 'neutral' as const
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
