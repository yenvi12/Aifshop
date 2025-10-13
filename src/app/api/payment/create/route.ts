import { NextResponse } from "next/server";
import { payos } from "@/lib/payos";
import { PrismaClient } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

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
    await prisma.payment.create({
      data: {
        orderCode: orderCode.toString(),
        amount,
        status: "pending",
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ checkoutUrl: payment.checkoutUrl });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
