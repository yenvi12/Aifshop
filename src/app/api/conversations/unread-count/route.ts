import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeToken, isTokenExpired } from "@/lib/tokenManager";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    if (isTokenExpired(token)) {
      return NextResponse.json({ success: false, error: "Token expired" }, { status: 401 });
    }

    const payload = decodeToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Get user from database using userId from token
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Count unread messages for this user
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: dbUser.id,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}