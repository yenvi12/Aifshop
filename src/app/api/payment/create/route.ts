import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";
import { PrismaClient } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}${random}`;
};

// Generate a unique order code for each request
const timestamp = Date.now();
const randomSuffix = Math.floor(Math.random() * 1000);
const orderCode = parseInt(`${timestamp}${randomSuffix}`);

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

    // Find user in DB
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { amount, description } = body;

    // Tạo yêu cầu thanh toán trên PayOS
    const payment = await payos.paymentRequests.create({
      orderCode,
      amount,
      description,
      returnUrl: "http://localhost:3000/payment-success",
      cancelUrl: "http://localhost:3000/payment-cancel",
    });

    // Lưu thông tin vào DB
    const dbPayment = await prisma.payment.create({
      data: {
        orderCode: orderCode.toString(),
        amount,
        status: "pending",
        userId: dbUser.id,
      },
    });

    // Tạo Order ngay lập tức từ Cart items
    try {
      // Get user's cart items
      const cartItems = await prisma.cart.findMany({
        where: { userId: dbUser.id },
        include: { product: true }
      });

      if (cartItems.length > 0) {
        // Calculate total from cart items
        let totalAmount = 0;
        cartItems.forEach((item) => {
          // Logic: if price > 0 use price, else use compareAtPrice
          const price = (item.product.price && item.product.price > 0) ? item.product.price : (item.product.compareAtPrice || 0);
          const itemTotal = price * item.quantity;
          console.log(`Item ${item.productId}: price=${item.product.price}, compareAtPrice=${item.product.compareAtPrice}, finalPrice=${price}, quantity=${item.quantity}, itemTotal=${itemTotal}`);
          if (price <= 0) {
            console.error(`Invalid price for product ${item.productId}: final price=${price}`);
          }
          totalAmount += itemTotal;
        });

        console.log(`Calculated total amount: ${totalAmount} for ${cartItems.length} items`);

        // Create Order (shipping address will be pulled from user profile)
        const order = await prisma.order.create({
          data: {
            userId: dbUser.id,
            paymentId: dbPayment.id,
            orderNumber: generateOrderNumber(),
            status: 'ORDERED',
            totalAmount
            // No shippingAddress field - will be pulled from user profile
          }
        });

        // Create OrderItems
        const orderItemsData = cartItems.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          priceAtTime: (item.product.price && item.product.price > 0) ? item.product.price : (item.product.compareAtPrice || 0)
        }));

        await prisma.orderItem.createMany({
          data: orderItemsData
        });

        // Clear user's cart
        await prisma.cart.deleteMany({
          where: { userId: dbUser.id }
        });

        console.log(`Order ${order.orderNumber} created for user ${dbUser.id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }

    return NextResponse.json({ checkoutUrl: payment.checkoutUrl });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
