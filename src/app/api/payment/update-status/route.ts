import { NextResponse } from "next/server";
import { PrismaClient, PaymentStatus, OrderStatus } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { orderCode, status, paymentMethod } = body;

    if (!orderCode || !status) {
      return NextResponse.json({ error: 'OrderCode and status are required' }, { status: 400 });
    }

    // Find user in DB
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update payment status - remove userId filter to allow webhook updates
    const updatedPayment = await prisma.payment.updateMany({
      where: {
        orderCode
      },
      data: {
        status: status as PaymentStatus
      }
    });

    if (updatedPayment.count === 0) {
      console.error(`Payment not found: orderCode=${orderCode}`);
      return NextResponse.json({
        error: 'Payment not found',
        details: 'Payment record may have been already updated or expired'
      }, { status: 404 });
    }

    console.log(`Payment status updated successfully: orderCode=${orderCode}, status=${status}, paymentMethod=${paymentMethod || 'N/A'}`);

    // Update Order status to CONFIRMED when payment is successful
    if (status === 'SUCCESS') {
      try {
        // Update existing orders to CONFIRMED status
        await prisma.order.updateMany({
          where: {
            payment: {
              orderCode
            },
            status: OrderStatus.ORDERED
          },
          data: {
            status: OrderStatus.CONFIRMED
          }
        });

        console.log(`Orders confirmed for payment ${orderCode}`);
      } catch (error) {
        console.error('Error confirming orders:', error);
      }
    }

    // Clear user's cart after successful payment (only for SUCCESS status)
    if (status === 'SUCCESS') {
      try {
        await prisma.cart.deleteMany({
          where: { userId: dbUser.id }
        });
        console.log(`Cart cleared for user ${dbUser.id} after successful payment`);
      } catch (error) {
        console.error('Error clearing cart:', error);
        // Don't fail the request if cart clearing fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      updatedCount: updatedPayment.count
    });
  } catch (error: unknown) {
    console.error('Error updating payment status:', error);

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
      if ('code' in error && error.code === 'P2002') {
        errorMessage = 'Payment already has this status';
        statusCode = 400;
      } else if ('code' in error && error.code === 'P2025') {
        errorMessage = 'Payment record not found';
        statusCode = 404;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}