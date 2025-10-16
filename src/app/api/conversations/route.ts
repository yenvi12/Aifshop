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

    // Get user from database - prioritize supabaseUserId, fallback to id
    let dbUser;
    if (payload.supabaseUserId) {
      dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: payload.supabaseUserId },
        select: { role: true, id: true, supabaseUserId: true }
      });
    }
    if (!dbUser && payload.userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { role: true, id: true, supabaseUserId: true }
      });
    }

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!dbUser.supabaseUserId) {
      return NextResponse.json({ success: false, error: "User not properly configured" }, { status: 400 });
    }

    let conversations: any[] = [];

    if (dbUser.role === "USER") {
      // For USER: Get conversations they've started (as sender)
      const userConversations = await prisma.message.groupBy({
        by: ["conversationId"],
        where: { senderId: dbUser.supabaseUserId },
        _count: { id: true },
        _max: { timestamp: true }
      });

      for (const conv of userConversations) {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.conversationId },
          orderBy: { timestamp: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true, supabaseUserId: true } },
            product: { select: { id: true, name: true, image: true, slug: true } }
          }
        });

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.conversationId,
            receiverId: dbUser.supabaseUserId,
            isRead: false
          }
        });

        if (lastMessage) {
          conversations.push({
            conversationId: conv.conversationId,
            product: lastMessage.product,
            lastMessage: {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              sender: lastMessage.sender,
              senderId: lastMessage.senderId,
              receiverId: lastMessage.receiverId
            },
            unreadCount,
            messageCount: (conv._count as any).id
          });
        }
      }
    } else if (dbUser.role === "ADMIN") {
      // For ADMIN: Get ALL conversations that involve admins and users
      // This creates a shared conversation pool where all admins can see all user-admin conversations

      // First get all admin user IDs to avoid join ambiguity
      const adminUserIds = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { supabaseUserId: true }
      });
      const adminIds = adminUserIds.map(u => u.supabaseUserId).filter((id): id is string => id !== null);

      const allAdminConversations = await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          OR: [
            // Messages sent by any admin
            { senderId: { in: adminIds } },
            // Messages received by any admin
            { receiverId: { in: adminIds } }
          ]
        },
        _count: { id: true },
        _max: { timestamp: true }
      });

      for (const conv of allAdminConversations) {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.conversationId },
          orderBy: { timestamp: "desc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, supabaseUserId: true, role: true } },
            receiver: { select: { id: true, firstName: true, lastName: true, supabaseUserId: true, role: true } },
            product: { select: { id: true, name: true, image: true, slug: true } }
          }
        });

        // Count unread messages for this specific admin
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.conversationId,
            receiverId: dbUser.supabaseUserId,
            isRead: false
          }
        });

        if (lastMessage) {
          conversations.push({
            conversationId: conv.conversationId,
            product: lastMessage.product,
            lastMessage: {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              sender: lastMessage.sender,
              senderId: lastMessage.senderId,
              receiverId: lastMessage.receiverId
            },
            unreadCount,
            messageCount: (conv._count as any).id
          });
        }
      }
    }

    // Sort conversations by last message timestamp (newest first)
    conversations.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}