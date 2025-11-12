import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";
import { PrismaClient } from "@prisma/client";
import { validateStockAvailability, deductStock } from "@/lib/inventory";

const prisma = new PrismaClient();

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}${random}`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const verified = await payos.webhooks.verify(body);

    // ✅ verified chứa thông tin giao dịch hợp lệ
    console.log("PAYOS Webhook:", verified);

    // Cập nhật trạng thái thanh toán trong database
    if (verified && verified.orderCode) {
      const orderCode = verified.orderCode.toString();

      // Tìm thanh toán theo orderCode
      const payment = await prisma.payment.findUnique({
        where: { orderCode },
        include: { user: true }
      });

      if (payment) {
        // Xử lý trạng thái thanh toán từ PayOS webhook
        // PayOS gửi webhook với thông tin giao dịch hợp lệ khi thanh toán thành công
        // Nếu có lỗi hoặc bị cancel thì sẽ không gửi webhook hoặc gửi với thông tin khác

        // Get orders and order items for stock validation
        const orders = await prisma.order.findMany({
          where: { paymentId: payment.id },
          include: {
            orderItems: {
              include: { product: true },
            },
          },
        });

        // Validate stock availability for all items before deducting
        const allOrderItems = orders.flatMap((order) => order.orderItems);
        const stockValidations: Array<{
          item: any;
          validation: Awaited<ReturnType<typeof validateStockAvailability>>;
        }> = [];

        for (const item of allOrderItems) {
          const validation = await validateStockAvailability(
            item.productId,
            item.quantity,
            item.size
          );
          stockValidations.push({ item, validation });

          if (!validation.available) {
            console.error(
              `[STOCK] Validation failed for product ${item.product.name}${
                item.size ? ` (Size: ${item.size})` : ""
              }: ${validation.error}`
            );
            break;
          }
        }

        // If any validation fails, cancel payment and orders
        const hasInsufficientStock = stockValidations.some(
          (sv) => !sv.validation.available
        );

        if (hasInsufficientStock) {
          await prisma.payment.update({
            where: { orderCode },
            data: { status: "CANCELLED" },
          });

          await prisma.order.updateMany({
            where: { paymentId: payment.id },
            data: { status: "CANCELLED" },
          });

          const failedItem = stockValidations.find(
            (sv) => !sv.validation.available
          );
          console.error(
            `[STOCK] Payment ${orderCode} cancelled due to insufficient stock: ${failedItem?.validation.error}`
          );

          return NextResponse.json({
            message: "Payment cancelled due to insufficient stock",
            error: failedItem?.validation.error,
          });
        }

        // Use transaction to ensure atomicity for stock deduction
        try {
          await prisma.$transaction(async (tx) => {
            // Deduct stock for all items
            for (const item of allOrderItems) {
              const result = await deductStock(
                item.productId,
                item.quantity,
                item.size
              );

              if (!result.success) {
                console.error(
                  `[STOCK] Deduction failed for product ${item.product.name}${
                    item.size ? ` (Size: ${item.size})` : ""
                  }: ${result.error}`
                );
                throw new Error(result.error);
              }

              console.log(
                `[STOCK] Action: DEDUCT | Product: ${item.product.name} | Size: ${
                  item.size || "N/A"
                } | Qty: ${item.quantity} | Order: ${
                  item.orderId
                } | New Stock: ${result.newStock}`
              );
            }

            // Update payment status
            await tx.payment.update({
              where: { orderCode },
              data: { status: "SUCCESS" },
            });

            console.log(`Payment ${orderCode} marked as successful`);

            // Update orders to CONFIRMED status
            await tx.order.updateMany({
              where: {
                paymentId: payment.id,
                status: "ORDERED",
              },
              data: { status: "CONFIRMED" },
            });

            console.log(`Orders confirmed for payment ${orderCode}`);

            // Clear user's cart after successful payment
            await tx.cart.deleteMany({
              where: { userId: payment.user.id },
            });

            console.log(
              `Cart cleared for user ${payment.user.id} after successful payment`
            );
          });
        } catch (error: any) {
          console.error(
            `[STOCK] Transaction failed for payment ${orderCode}:`,
            error
          );

          // Rollback: cancel payment and orders
          await prisma.payment.update({
            where: { orderCode },
            data: { status: "CANCELLED" },
          });

          await prisma.order.updateMany({
            where: { paymentId: payment.id },
            data: { status: "CANCELLED" },
          });

          return NextResponse.json(
            {
              message: "Payment processing failed",
              error: error.message,
            },
            { status: 500 }
          );
        }
      } else {
        console.error(`Payment with orderCode ${orderCode} not found`);
      }
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Invalid webhook:", error);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }
}
