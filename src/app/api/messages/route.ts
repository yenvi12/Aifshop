import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { decodeToken, isTokenExpired } from "@/lib/tokenManager";
import DOMPurify from "isomorphic-dompurify";

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

    // Verify user exists in database - prioritize supabaseUserId, fallback to id
    let dbUser;
    if (payload.supabaseUserId) {
      dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: payload.supabaseUserId },
        select: { id: true, role: true, supabaseUserId: true }
      });
    }
    if (!dbUser && payload.userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, supabaseUserId: true }
      });
    }

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!dbUser.supabaseUserId) {
      return NextResponse.json({ success: false, error: "User not properly configured" }, { status: 400 });
    }

    // Get conversationId from query params
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user is part of this conversation
    let conversation;
    if (dbUser.role === "ADMIN") {
      // For admins, allow access to any conversation that involves admin-user communication
      conversation = await prisma.message.findFirst({
        where: {
          conversationId,
          OR: [
            { sender: { role: "ADMIN" } },
            { receiver: { role: "ADMIN" } }
          ]
        }
      });
    } else {
      // For regular users, maintain original access control
      conversation = await prisma.message.findFirst({
        where: {
          conversationId,
          OR: [
            { senderId: dbUser.supabaseUserId },
            { receiverId: dbUser.supabaseUserId }
          ]
        }
      });
    }

    if (!conversation) {
      return NextResponse.json({ success: false, error: "Conversation not found or access denied" }, { status: 404 });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true }
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true }
        },
        product: {
          select: { id: true, name: true, image: true, slug: true }
        }
      },
      orderBy: { timestamp: "asc" }
    });

    // Unify admin display for consistent UI
    const unifiedMessages = messages.map(message => ({
      ...message,
      sender: message.sender.role === "ADMIN" ? {
        ...message.sender,
        firstName: "Support",
        lastName: "Team",
        avatar: null // Will use default support icon
      } : message.sender,
      receiver: message.receiver.role === "ADMIN" ? {
        ...message.receiver,
        firstName: "Support",
        lastName: "Team",
        avatar: null // Will use default support icon
      } : message.receiver
    }));

    // Mark messages as read (only for receiver)
    if (dbUser.role === "ADMIN") {
      // For admins, mark messages as read for any admin in this conversation
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiver: { role: "ADMIN" },
          isRead: false
        },
        data: { isRead: true }
      });
    } else {
      // For regular users, only mark messages sent directly to them
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: dbUser.supabaseUserId,
          isRead: false
        },
        data: { isRead: true }
      });
    }

    return NextResponse.json({
      success: true,
      data: unifiedMessages
    });

  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Verify user exists in database - prioritize supabaseUserId, fallback to id
    let dbUser;
    if (payload.supabaseUserId) {
      dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: payload.supabaseUserId },
        select: { id: true, role: true, supabaseUserId: true }
      });
    }
    if (!dbUser && payload.userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, supabaseUserId: true }
      });
    }

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!dbUser.supabaseUserId) {
      return NextResponse.json({ success: false, error: "User not properly configured" }, { status: 400 });
    }

    const body = await request.json();
    const { conversationId, receiverId, productId, content } = body;

    // Validate required fields
    if (!conversationId || !receiverId || !productId || !content) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Sanitize content
    const sanitizedContent = DOMPurify.sanitize(content.trim());
    if (!sanitizedContent || sanitizedContent.length > 1000) {
      return NextResponse.json({ success: false, error: "Invalid message content" }, { status: 400 });
    }

    // Resolve receiver to get supabaseUserId - prioritize supabaseUserId search, fallback to id
    let receiverUser;
    if (receiverId) {
      // Try to find by supabaseUserId first
      receiverUser = await prisma.user.findUnique({
        where: { supabaseUserId: receiverId },
        select: { id: true, supabaseUserId: true, role: true }
      });
      // If not found and receiverId looks like a UUID, try by id
      if (!receiverUser && receiverId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        receiverUser = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { id: true, supabaseUserId: true, role: true }
        });
      }
    }

    if (!receiverUser || !receiverUser.supabaseUserId) {
      return NextResponse.json({ success: false, error: "Receiver not found" }, { status: 404 });
    }

    const resolvedReceiverId = receiverUser.supabaseUserId;

    // For new conversations, validate receiver role
    // Skip validation if this is an existing conversation (has messages)
    const existingConversation = await prisma.message.findFirst({
      where: { conversationId },
      select: { id: true }
    });

    if (!existingConversation) {
      // New conversation - ensure USER always messages ADMIN
      const isValidConversation = (dbUser.role === "USER" && receiverUser.role === "ADMIN") ||
                                  (dbUser.role === "ADMIN" && receiverUser.role === "USER");

      if (!isValidConversation) {
        return NextResponse.json({
          success: false,
          error: "Users can only message with admins. Please contact support for assistance."
        }, { status: 400 });
      }
    } else {
      // For existing conversations, if the receiver is an admin, allow any admin to respond
      // This enables shared admin conversations where multiple admins can handle the same conversation
      if (receiverUser.role === "ADMIN" && dbUser.role === "ADMIN") {
        // Allow admin-to-admin messaging within existing conversations
        // This is fine for shared conversations
      }
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: dbUser.supabaseUserId,
        receiverId: resolvedReceiverId,
        productId,
        content: sanitizedContent
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true }
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true }
        },
        product: {
          select: { id: true, name: true, image: true, slug: true }
        }
      }
    });

    // Mark message as unread for receiver
    await prisma.message.update({
      where: { id: message.id },
      data: { isRead: false }
    });

    console.log(`Message created: ${message.id} from ${dbUser.id} to ${receiverId}`);

    return NextResponse.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}