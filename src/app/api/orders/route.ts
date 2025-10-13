import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Find user in DB
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get orders with orderItems, product details, and user shipping address
    const orders = await prisma.order.findMany({
      where: { userId: dbUser.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        trackingNumber: true,
        estimatedDelivery: true,
        createdAt: true,
        updatedAt: true,
        orderItems: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            size: true,
            priceAtTime: true,
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                slug: true
              }
            }
          }
        },
        payment: {
          select: {
            orderCode: true,
            status: true,
            amount: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            defaultAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}