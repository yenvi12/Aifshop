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

      // Calculate previous period data using raw SQL for better performance
      (async () => {
        const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousEnd = startDate;
        const result = await prisma.$queryRaw`
          SELECT COALESCE(SUM("totalAmount"), 0) as total
          FROM orders
          WHERE "createdAt" >= ${previousStart}
            AND "createdAt" < ${previousEnd}
            AND status IN ('SHIPPED', 'DELIVERED')
        `;
        return Number((result as any)[0].total);
      })(),

      (async () => {
        const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousEnd = startDate;
        const result = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM orders
          WHERE "createdAt" >= ${previousStart}
            AND "createdAt" < ${previousEnd}
            AND status IN ('SHIPPED', 'DELIVERED')
        `;
        return Number((result as any)[0].count);
      })(),

      (async () => {
        // Optimize by using raw SQL for daily trends to reduce multiple queries
        const days = 30;
        const trendData = [];
        const startTrendDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
        const endTrendDate = now;

        // Get daily revenue and orders in a single query using raw SQL
        const dailyData = await prisma.$queryRaw`
          SELECT
            DATE("createdAt") as date,
            COALESCE(SUM("totalAmount"), 0) as revenue,
            COUNT(*) as orders
          FROM orders
          WHERE "createdAt" >= ${startTrendDate}
            AND "createdAt" < ${endTrendDate}
            AND status IN ('SHIPPED', 'DELIVERED')
          GROUP BY DATE("createdAt")
          ORDER BY date DESC
        `;

        // Create a map for quick lookup
        const dataMap = new Map();
        (dailyData as any[]).forEach((row: any) => {
          dataMap.set(row.date.toISOString().split('T')[0], {
            revenue: Number(row.revenue),
            orders: Number(row.orders)
          });
        });

        // Fill in the last 30 days
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const existing = dataMap.get(dateStr);

          trendData.push({
            date: dateStr,
            revenue: existing ? existing.revenue : 0,
            orders: existing ? existing.orders : 0
          });
        }

        return trendData;
      })(),

      (async () => {
        // Optimize user growth with raw SQL
        const days = 30;
        const trendData = [];
        const startTrendDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
        const endTrendDate = now;

        const dailyUsers = await prisma.$queryRaw`
          SELECT
            DATE("createdAt") as date,
            COUNT(*) as users
          FROM users
          WHERE "createdAt" >= ${startTrendDate}
            AND "createdAt" < ${endTrendDate}
          GROUP BY DATE("createdAt")
          ORDER BY date DESC
        `;

        const dataMap = new Map();
        (dailyUsers as any[]).forEach((row: any) => {
          dataMap.set(row.date.toISOString().split('T')[0], Number(row.users));
        });

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          trendData.push({
            date: dateStr,
            users: dataMap.get(dateStr) || 0
          });
        }

        return trendData;
      })(),

      (async () => {
        const statusCounts = await prisma.order.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { createdAt: { gte: startDate } }
        });

        const totalOrdersInRange = statusCounts.reduce((sum, item) => sum + item._count.status, 0);

        return statusCounts.map(item => ({
          status: item.status,
          count: item._count.status,
          percentage: totalOrdersInRange > 0 ? Math.round((item._count.status / totalOrdersInRange) * 100 * 10) / 10 : 0
        }));
      })(),

      (async () => {
        const topProductsData = await prisma.orderItem.groupBy({
          by: ['productId'],
          _sum: {
            quantity: true,
            priceAtTime: true
          },
          _count: {
            orderId: true
          },
          where: {
            order: {
              createdAt: { gte: startDate },
              status: { in: ['SHIPPED', 'DELIVERED'] }
            }
          },
          orderBy: {
            _sum: {
              quantity: 'desc'
            }
          },
          take: 5
        });

        const topProducts = await Promise.all(
          topProductsData.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { name: true }
            });

            return {
              name: product?.name || 'Unknown Product',
              sales: item._sum.quantity || 0,
              revenue: item._sum.priceAtTime || 0,
              orders: item._count.orderId
            };
          })
        );

        return topProducts;
      })()
    ]);

    const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;

    // Calculate real trends by comparing with previous period
    const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousEnd = startDate;

    // Previous period calculations already optimized above in Promise.all
    const previousRevenue = previousPeriodRevenue;
    const previousOrders = previousPeriodOrders;

    const previousUsers = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${previousStart}
        AND "createdAt" < ${previousEnd}
    `;

    const previousUsersCount = Number((previousUsers as any)[0].count);

    const previousAOV = previousOrders > 0 ? (previousRevenue || 0) / previousOrders : 0;

    const revenueChange = previousRevenue && previousRevenue > 0
      ? ((revenueInRange - previousRevenue) / previousRevenue) * 100
      : 0;

    const ordersChange = previousOrders > 0
      ? ((ordersInRange - previousOrders) / previousOrders) * 100
      : 0;

    const userChange = totalUsers > previousUsersCount
      ? ((totalUsers - previousUsersCount) / previousUsersCount) * 100
      : 0;

    const aovChange = previousAOV > 0
      ? ((averageOrderValue - previousAOV) / previousAOV) * 100
      : 0;

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
