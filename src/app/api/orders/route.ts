import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, OrderStatus, PaymentStatus } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

// Interface for order creation request
interface CreateOrderRequest {
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  amount: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
  };
  cartItems: Array<{
    id: string;
    quantity: number;
    size: string | null;
    product: {
      id: string;
      name: string;
      price: number;
      compareAtPrice: number | null;
      image: string | null;
      stock: number;
    };
  }>;
  shippingMethod: string;
}

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
        shippingAddress: true,
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

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: CreateOrderRequest = await request.json();
    const {
      paymentMethod,
      paymentStatus,
      orderStatus,
      amount,
      shippingAddress,
      cartItems,
      shippingMethod
    } = body;

    // Validate required fields
    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address) {
      return NextResponse.json({ error: 'Thông tin giao hàng không đầy đủ' }, { status: 400 });
    }

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Giỏ hàng trống' }, { status: 400 });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create payment record first for COD
    const paymentRecord = await prisma.payment.create({
      data: {
        orderCode: orderNumber,
        amount: amount,
        status: paymentStatus as PaymentStatus,
        userId: dbUser.id
      }
    });

    // Create order with shipping address as JSON and paymentId
    const fullShippingAddress = {
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      fullName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()
    };

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: orderStatus as OrderStatus,
        totalAmount: amount,
        userId: dbUser.id,
        paymentId: paymentRecord.id,
        shippingAddress: fullShippingAddress,
        estimatedDelivery: new Date(Date.now() + (shippingMethod === 'express' ? 2 : 5) * 24 * 60 * 60 * 1000)
      }
    });

    // Create order items
    const orderItems = [];
    for (const item of cartItems) {
      const price = item.product.price || item.product.compareAtPrice || 0;

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          quantity: item.quantity,
          size: item.size,
          priceAtTime: price
        }
      });
      orderItems.push(orderItem);
    }

    // Get final order with all relations
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: true,
        payment: true
      }
    });

    // Clear cart after successful order
    await prisma.cart.deleteMany({
      where: {
        userId: dbUser.id,
        productId: {
          in: cartItems.map(item => item.product.id)
        }
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: finalOrder!.id,
        orderNumber: finalOrder!.orderNumber,
        status: finalOrder!.status,
        totalAmount: finalOrder!.totalAmount,
        createdAt: finalOrder!.createdAt,
        orderItems: finalOrder!.orderItems,
        shippingAddress: finalOrder!.shippingAddress,
        payment: finalOrder!.payment
      }
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Không thể tạo đơn hàng' }, { status: 500 });
  }
}