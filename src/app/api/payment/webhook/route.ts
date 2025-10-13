import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const verified = await payos.webhooks.verify(body);

    // ✅ verified chứa thông tin giao dịch hợp lệ
    console.log("PAYOS Webhook:", verified);

    // TODO: cập nhật trạng thái đơn hàng trong database (VD: paid = true)

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Invalid webhook:", error);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }
}
