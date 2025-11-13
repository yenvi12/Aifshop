import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

interface ShippingAddress {
  shipping: string;
  billing: string;
}

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
    const { amount, description, shippingAddress, paymentMethod = "PAYOS" } = body;

    console.log('💰 Payment request received:', {
      paymentMethod,
      amount,
      hasShippingAddress: !!shippingAddress,
      shippingAddress: shippingAddress || 'NOT_PROVIDED',
      description
    });

    // Validate payment method
    if (!["PAYOS", "COD"].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    let checkoutUrl = null;
    
    // Lưu thông tin vào DB
    const dbPayment = await prisma.payment.create({
      data: {
        orderCode: orderCode.toString(),
        amount,
        status: "PENDING",
        paymentMethod: paymentMethod,
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

        // Create Order with shipping address snapshot (prefer custom address over profile default)
        const orderData: any = {
          userId: dbUser.id,
          paymentId: dbPayment.id,
          orderNumber: generateOrderNumber(),
          status: OrderStatus.ORDERED,
          totalAmount,
          shippingAddress: undefined
        };

        // Use custom shipping address if provided, otherwise fall back to profile default
        if (shippingAddress) {
          // Format the shipping address - chỉ hiển thị địa chỉ, không cần tên
          const addressParts = [];

          // Add street address if provided
          if (shippingAddress.address && shippingAddress.address.trim()) {
            addressParts.push(shippingAddress.address.trim());
          }

          // Add city if provided
          if (shippingAddress.city && shippingAddress.city.trim()) {
            addressParts.push(shippingAddress.city.trim());
          }

          // Add postal code if provided
          if (shippingAddress.postalCode && shippingAddress.postalCode.trim()) {
            addressParts.push(shippingAddress.postalCode.trim());
          }

          // Chỉ hiển thị địa chỉ, không cần tên người nhận
          const shippingText = addressParts.length > 0
            ? addressParts.join(', ')
            : 'Địa chỉ chưa được cập nhật';

          const formattedShippingAddress = {
            shipping: shippingText,
            billing: shippingAddress.address || `Địa chỉ: ${shippingAddress.city || 'Chưa cập nhật'}`
          };
          orderData.shippingAddress = formattedShippingAddress;
        } else if (dbUser.defaultAddress) {
          orderData.shippingAddress = dbUser.defaultAddress;
        }

        const order = await prisma.order.create({
          data: orderData
        });

        console.log('✅ PayOS Order created successfully:', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          shippingAddress: order.shippingAddress,
          paymentMethod: paymentMethod,
          totalAmount: totalAmount
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

        console.log(`Order ${order.orderNumber} created for user ${dbUser.id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }

    // Chỉ tạo payment request trên PayOS khi paymentMethod là PAYOS
    if (paymentMethod === "PAYOS") {
      try {
        const payment = await payos.paymentRequests.create({
          orderCode,
          amount,
          description,
          returnUrl: "https://aifshop-blond.vercel.app/payment-success",
          cancelUrl: "https://aifshop-blond.vercel.app/payment-cancel",
        });
        checkoutUrl = payment.checkoutUrl;
      } catch (payosError) {
        console.error('PayOS payment creation failed:', payosError);
        return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
      }
    }

    return NextResponse.json({
      checkoutUrl,
      orderCode: orderCode.toString(),
      paymentMethod
    });
  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
