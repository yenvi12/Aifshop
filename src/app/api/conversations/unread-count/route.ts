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

    // Get user from database using supabaseUserId from token
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: payload.supabaseUserId || payload.userId },
      select: { id: true, role: true, supabaseUserId: true }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!dbUser.supabaseUserId) {
      return NextResponse.json({ success: false, error: "User not properly configured" }, { status: 400 });
    }

    // Count unread messages for this user
    let unreadCount;
    if (dbUser.role === "ADMIN") {
      // For admins, count unread messages in any admin-user conversation
      // Get all admin IDs first
      const adminUserIds = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { supabaseUserId: true }
      });
      const adminIds = adminUserIds.map(u => u.supabaseUserId).filter((id): id is string => id !== null);

      // Get conversation IDs that involve admins
      const adminConversations = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: { in: adminIds } },
            { receiverId: { in: adminIds } }
          ]
        },
        select: { conversationId: true },
        distinct: ["conversationId"]
      });
      const conversationIds = adminConversations.map(c => c.conversationId);

      // Count unread messages for this admin in admin conversations
      unreadCount = await prisma.message.count({
        where: {
          conversationId: { in: conversationIds },
          receiverId: dbUser.supabaseUserId,
          isRead: false
        }
      });
    } else {
      // For regular users, count only messages sent directly to them
      unreadCount = await prisma.message.count({
        where: {
          receiverId: dbUser.supabaseUserId,
          isRead: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}