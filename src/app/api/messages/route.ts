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

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Get conversationId from query params
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user is part of this conversation
    const conversation = await prisma.message.findFirst({
      where: {
        conversationId,
        OR: [
          { senderId: dbUser.id },
          { receiverId: dbUser.id }
        ]
      }
    });

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

    // Mark messages as read (only for receiver)
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: dbUser.id,
        isRead: false
      },
      data: { isRead: true }
    });

    return NextResponse.json({
      success: true,
      data: messages
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

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
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

    // For new conversations, validate receiver role
    // Skip validation if this is an existing conversation (has messages)
    const existingConversation = await prisma.message.findFirst({
      where: { conversationId },
      select: { id: true }
    });

    if (!existingConversation) {
      // New conversation - validate roles
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { role: true }
      });

      if (!receiver) {
        return NextResponse.json({ success: false, error: "Receiver not found" }, { status: 404 });
      }

      const isValidConversation = (dbUser.role === "USER" && receiver.role === "ADMIN") ||
                                 (dbUser.role === "ADMIN" && receiver.role === "USER");

      if (!isValidConversation) {
        return NextResponse.json({ success: false, error: "Invalid conversation participants" }, { status: 400 });
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
        senderId: dbUser.id,
        receiverId,
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