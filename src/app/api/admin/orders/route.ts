import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma, OrderStatus, PaymentStatus } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production-123456789";

// ✅ JWT payload type
interface AdminJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ✅ Token verification with type safety
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Authorization header missing", status: 401 };
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (decoded.role !== "ADMIN") {
      return { error: "Admin access required", status: 403 };
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authResult = verifyAdminToken(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";

    const skip = (page - 1) * limit;

    // ✅ Type-safe where clause
    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        {
          orderNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      ];
    }

    // ✅ Ensure enum values are valid
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }

    if (
      paymentStatus &&
      Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)
    ) {
      where.payment = {
        status: paymentStatus as PaymentStatus,
      };
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          trackingNumber: true,
          estimatedDelivery: true,
          shippingNote: true,
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
                  slug: true,
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              orderCode: true,
              status: true,
              amount: true,
              paymentMethod: true,
            },
          },
          shippingAddress: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // ✅ Ensure shipping address is properly displayed for all orders
    const processedOrders = orders.map(order => ({
      ...order,
      shippingAddress: order.shippingAddress,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: processedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Only cancelled orders can be deleted" },
        { status: 400 }
      );
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
