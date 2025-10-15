"use client";

import Image from "next/image";
import { format } from "date-fns";

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

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageItem({ message, isOwn }: MessageItemProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return format(date, "HH:mm");
    } else if (diffInDays === 1) {
      return "Yesterday " + format(date, "HH:mm");
    } else if (diffInDays < 7) {
      return format(date, "EEE HH:mm");
    } else {
      return format(date, "MMM d, HH:mm");
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`} role="listitem">
      <div className={`flex max-w-xs lg:max-w-md ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isOwn ? "ml-3" : "mr-3"}`}>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#e1e5e9]">
            {message.sender.avatar ? (
              <Image
                src={message.sender.avatar}
                alt={`${message.sender.firstName} ${message.sender.lastName}`}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium bg-[#8e9297]">
                {message.sender.firstName.charAt(0).toUpperCase()}
                {message.sender.lastName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Message Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl shadow-sm transition-transform ${
            isOwn
              ? "bg-[#0088cc] text-white message-bubble-own"
              : "bg-white text-[#2c2d30] message-bubble-other border border-[#e1e5e9]"
          }`}
        >
          {/* Message Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Timestamp and Status */}
          <div className={`flex items-center mt-2 text-xs ${
            isOwn ? "text-[#b3d9ff] justify-end" : "text-[#8e9297] justify-start"
          }`}>
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && (
              <span className="ml-2">
                {message.isRead ? (
                  <span className="text-[#b3d9ff]">✓✓</span>
                ) : (
                  <span className="text-[#7bb7e6]">✓</span>
                )}
              </span>
            )}
          </div>

          {/* Tail for speech bubble effect */}
          <div
            className={`absolute top-4 ${
              isOwn
                ? "-right-2 border-l-[#0088cc] border-l-8 border-t-4 border-t-transparent border-b-4 border-b-transparent"
                : "-left-2 border-r-white border-r-8 border-t-4 border-t-transparent border-b-4 border-b-transparent"
            }`}
          />
        </div>
      </div>
    </div>
  );
}