import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";
import { PrismaClient } from "@prisma/client";

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

        await prisma.payment.update({
          where: { orderCode },
          data: {
            status: 'SUCCESS',
          }
        });

        console.log(`Payment ${orderCode} marked as successful`);

        // Update Order status to CONFIRMED when payment is successful
        try {
          // Update existing orders to CONFIRMED status
          await prisma.order.updateMany({
            where: {
              paymentId: payment.id,
              status: 'ORDERED'
            },
            data: {
              status: 'CONFIRMED'
            }
          });

          console.log(`Orders confirmed for payment ${orderCode}`);

          // Clear user's cart after successful payment
          await prisma.cart.deleteMany({
            where: { userId: payment.user.id }
          });

          console.log(`Cart cleared for user ${payment.user.id} after successful payment`);
          } catch (error) {
            console.error('Error confirming orders or clearing cart:', error);
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
