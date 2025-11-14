import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { validateStockAvailability, deductStock, restoreStock } from "@/lib/inventory";

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
    const { status, trackingNumber, estimatedDelivery, shippingNote } = body;

    // ✅ Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        payment: true,
        orderItems: {
          include: { product: true }
        }
      },
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

      if (order.status === "CANCELLED" && status !== "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot change status of cancelled orders" },
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

    // ✅ Handle stock deduction for COD orders when status changes to SHIPPED
    if (status === "SHIPPED" && order.status !== "SHIPPED") {
      // Validate stock availability first
      for (const item of order.orderItems) {
        const validation = await validateStockAvailability(
          item.productId,
          item.quantity,
          item.size
        );

        if (!validation.available) {
          // Auto-cancel order if stock insufficient
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED" },
          });

          console.error(
            `[STOCK] Order ${order.orderNumber} auto-cancelled due to insufficient stock: ${validation.error}`
          );

          return NextResponse.json(
            {
              error: "Insufficient stock",
              message: `Cannot ship order. Product '${item.product.name}'${
                item.size ? ` (Size: ${item.size})` : ""
              } only has ${validation.currentStock} in stock, but order requires ${
                item.quantity
              }.`,
              action: "Order has been automatically cancelled.",
            },
            { status: 400 }
          );
        }
      }

      // Deduct stock using transaction
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of order.orderItems) {
            const result = await deductStock(
              item.productId,
              item.quantity,
              item.size
            );

            if (!result.success) {
              console.error(
                `[STOCK] Deduction failed for order ${order.orderNumber}, product ${item.product.name}: ${result.error}`
              );
              throw new Error(result.error);
            }

            console.log(
              `[STOCK] Action: DEDUCT | Product: ${item.product.name} | Size: ${
                item.size || "N/A"
              } | Qty: ${item.quantity} | Order: ${order.orderNumber} | New Stock: ${
                result.newStock
              }`
            );
          }
        });
      } catch (error: any) {
        // Auto-cancel order on deduction failure
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });

        console.error(
          `[STOCK] Order ${order.orderNumber} auto-cancelled due to deduction failure:`,
          error
        );

        return NextResponse.json(
          {
            error: "Stock deduction failed",
            message: error.message,
            action: "Order has been automatically cancelled.",
          },
          { status: 500 }
        );
      }
    }

    // ✅ Handle stock restoration when order is cancelled
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      // Check if stock was already deducted
      const shouldRestoreStock =
        order.payment.status === "SUCCESS" ||
        ["SHIPPED", "DELIVERED"].includes(order.status);

      if (shouldRestoreStock) {
        console.log(
          `[STOCK] Restoring stock for cancelled order ${order.orderNumber}`
        );

        for (const item of order.orderItems) {
          const result = await restoreStock(
            item.productId,
            item.quantity,
            item.size
          );

          if (!result.success) {
            console.error(
              `[STOCK] Failed to restore stock for order ${order.orderNumber}, product ${item.product.name}: ${result.error}`
            );
          } else {
            console.log(
              `[STOCK] Action: RESTORE | Product: ${item.product.name} | Size: ${
                item.size || "N/A"
              } | Qty: ${item.quantity} | Order: ${order.orderNumber} | New Stock: ${
                result.newStock
              }`
            );
          }
        }
      } else {
        console.log(
          `[STOCK] No stock restoration needed for order ${order.orderNumber} (stock was not deducted)`
        );
      }
    }

    // ✅ Update COD payment status to SUCCESS when order is DELIVERED
    if (status === "DELIVERED" && order.status !== "DELIVERED") {
      if (order.payment.paymentMethod === "COD" && order.payment.status !== "SUCCESS") {
        await prisma.payment.update({
          where: { id: order.paymentId },
          data: { status: "SUCCESS" },
        });
        console.log(
          `[PAYMENT] COD payment ${order.payment.orderCode} marked as SUCCESS for delivered order ${order.orderNumber}`
        );
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
    if (shippingNote !== undefined)
      updateData.shippingNote = shippingNote || null;

    // ✅ Update order with correct includes
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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
