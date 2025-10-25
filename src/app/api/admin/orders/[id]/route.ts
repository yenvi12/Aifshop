import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production-123456789";

// ✅ Define JWT payload type
interface AdminJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ✅ Verify admin token safely
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
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = verifyAdminToken(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const body = await request.json();
    const { status, trackingNumber, estimatedDelivery } = body;

    // ✅ Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ✅ Validate status transitions
    if (status) {
      const validStatuses = [
        "ORDERED",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      if (order.status === "DELIVERED" && status !== "DELIVERED") {
        return NextResponse.json(
          { error: "Cannot change status of delivered orders" },
          { status: 400 }
        );
      }

      if (
        status === "SHIPPED" &&
        !order.trackingNumber &&
        !trackingNumber &&
        order.status !== "SHIPPED"
      ) {
        console.warn("Warning: Updating to SHIPPED status without tracking number");
      }

      if (
        status === "DELIVERED" &&
        !order.trackingNumber &&
        !trackingNumber &&
        order.status !== "DELIVERED"
      ) {
        console.warn("Warning: Updating to DELIVERED status without tracking number");
      }
    }

    // ✅ Type-safe update object
    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (trackingNumber !== undefined)
      updateData.trackingNumber = trackingNumber || null;
    if (estimatedDelivery !== undefined)
      updateData.estimatedDelivery = estimatedDelivery
        ? new Date(estimatedDelivery)
        : null;

    // ✅ Update order with correct includes
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
                slug: true,
              },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            defaultAddress: true,
          },
        },
        Product: true, // Optional: include if you need info from related product
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
