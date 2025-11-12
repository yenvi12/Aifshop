import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { supabase } from "@/lib/supabase";
import { restoreStock } from "@/lib/inventory";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: true },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== dbUser.id) {
      return NextResponse.json(
        { error: "You don't have permission to cancel this order" },
        { status: 403 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order is already cancelled" },
        { status: 400 }
      );
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot cancel delivered orders" },
        { status: 400 }
      );
    }

    if (order.status === "SHIPPED") {
      return NextResponse.json(
        {
          error: "Cannot cancel shipped orders",
          message:
            "Your order has already been shipped. Please contact customer support for assistance.",
        },
        { status: 400 }
      );
    }

    const shouldRestoreStock =
      order.payment.status === "SUCCESS" ||
      ["SHIPPED", "DELIVERED"].includes(order.status);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    console.log(
      `[ORDER] Order ${order.orderNumber} cancelled by user ${dbUser.email}`
    );

    if (shouldRestoreStock) {
      console.log(
        `[STOCK] Restoring stock for user-cancelled order ${order.orderNumber}`
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

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
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
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
