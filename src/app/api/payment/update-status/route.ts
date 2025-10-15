import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase-server";

const prisma = new PrismaClient();

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

    const body = await req.json();
    const { orderCode, status } = body;

    if (!orderCode || !status) {
      return NextResponse.json({ error: 'OrderCode and status are required' }, { status: 400 });
    }

    // Find user in DB
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.updateMany({
      where: {
        orderCode,
        userId: dbUser.id
      },
      data: {
        status: status as any // PaymentStatus enum
      }
    });

    if (updatedPayment.count === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}