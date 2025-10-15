"use client";

import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  productId: string;
  content: string;
  isRead: boolean;
  timestamp: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
  };
  product: {
    id: string;
    name: string;
    image?: string;
    slug: string;
  };
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string | undefined;
}

export default function MessageList({
  messages,
  loading,
  currentUserId,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0088cc]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] px-4 py-2" role="log" aria-live="polite" aria-label="Danh sách tin nhắn">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[#8e9297]">
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium">Chưa có tin nhắn nào</p>
            <p className="text-sm">Bắt đầu cuộc trò chuyện!</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="message-item"
              style={{
                animationDelay: `${Math.min(index * 0.05, 0.5)}s`,
                animationFillMode: "both"
              }}
            >
              <MessageItem
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}