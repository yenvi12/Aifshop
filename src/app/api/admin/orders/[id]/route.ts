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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const body = await request.json();
    const { status, trackingNumber, estimatedDelivery } = body;

    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate status transition
    if (status) {
      const validStatuses = ['ORDERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      // Business logic validations
      if (order.status === 'DELIVERED' && status !== 'DELIVERED') {
        return NextResponse.json({ error: 'Cannot change status of delivered orders' }, { status: 400 });
      }

      // Allow status updates without tracking number for admin convenience
      // Tracking number can be added separately if needed
      // Only require tracking number when explicitly provided or when moving to SHIPPED/DELIVERED from lower statuses
      if (status === 'SHIPPED' && !order.trackingNumber && !trackingNumber && order.status !== 'SHIPPED') {
        // Allow updating to SHIPPED without tracking number initially
        // Admin can add tracking number later
        console.log('Warning: Updating to SHIPPED status without tracking number');
      }

      // Allow status updates to DELIVERED even without tracking number for admin flexibility
      // Tracking number is recommended but not strictly required for status updates
      if (status === 'DELIVERED' && !order.trackingNumber && !trackingNumber && order.status !== 'DELIVERED') {
        console.log('Warning: Updating to DELIVERED status without tracking number');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null;
    }

    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
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
        payment: true,
        shippingAddress: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            defaultAddress: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}