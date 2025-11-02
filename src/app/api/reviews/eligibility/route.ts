import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface JwtPayload {
  userId?: string;
  supabaseUserId?: string;
  role?: string;
  exp?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get auth token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization token required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT to get user info
    let userId: string | null = null;
    let userRole: string | null = null;
    
    try {
      const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;
      userId = payload.userId || payload.supabaseUserId || null;
      userRole = payload.role || null;
    } catch (error) {
      console.error("Error decoding token:", error);
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID not found in token" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (userRole === "ADMIN") {
      return NextResponse.json({
        success: true,
        canReview: false,
        reason: "Admin không thể review sản phẩm"
      });
    }

    // Check if user has a delivered order with this product
    const deliveredOrders = await prisma.order.findMany({
      where: {
        userId: userId,
        status: "DELIVERED",
        orderItems: {
          some: {
            productId: productId
          }
        }
      },
      select: {
        id: true,
        orderNumber: true
      },
      take: 1
    });

    if (deliveredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        canReview: false,
        reason: "Bạn cần mua và nhận hàng thành công sản phẩm này để có thể đánh giá"
      });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: productId,
        userId: userId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    if (existingReview) {
      return NextResponse.json({
        success: true,
        canReview: false,
        reason: "Bạn đã đánh giá sản phẩm này rồi"
      });
    }

    // User can review
    return NextResponse.json({
      success: true,
      canReview: true,
      reason: "Bạn có thể đánh giá sản phẩm này"
    });

  } catch (error) {
    console.error("Review eligibility check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}