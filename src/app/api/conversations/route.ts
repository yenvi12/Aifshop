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
      select: { role: true, id: true }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let conversations: any[] = [];

    if (dbUser.role === "USER") {
      // For USER: Get conversations they've started (as sender)
      const userConversations = await prisma.message.groupBy({
        by: ["conversationId"],
        where: { senderId: dbUser.id },
        _count: { id: true },
        _max: { timestamp: true }
      });

      for (const conv of userConversations) {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.conversationId },
          orderBy: { timestamp: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true } },
            product: { select: { id: true, name: true, image: true, slug: true } }
          }
        });

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.conversationId,
            receiverId: dbUser.id,
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
            messageCount: conv._count.id
          });
        }
      }
    } else if (dbUser.role === "ADMIN") {
      // For ADMIN: Get all conversations where they are involved (as sender or receiver)
      // This includes conversations they started AND conversations where USERs messaged them
      const adminConversations = await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          OR: [
            { senderId: dbUser.id },   // Conversations ADMIN started
            { receiverId: dbUser.id }  // Conversations sent to ADMIN
          ]
        },
        _count: { id: true },
        _max: { timestamp: true }
      });

      for (const conv of adminConversations) {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.conversationId },
          orderBy: { timestamp: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true } },
            product: { select: { id: true, name: true, image: true, slug: true } }
          }
        });

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.conversationId,
            receiverId: dbUser.id,
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
            messageCount: conv._count.id
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