"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  conversationId: string;
  product: {
    id: string;
    name: string;
    image?: string;
    slug: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
  unreadCount: number;
  messageCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div className="bg-[#f8f9fa] h-full" role="navigation" aria-label="Conversation list">
      {/* Conversations List */}
      <div className="overflow-y-auto h-full">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-[#8e9297]">
            <div className="text-4xl mb-4">💬</div>
            <p>Chưa có cuộc trò chuyện nào</p>
            <p className="text-sm mt-2">
              Bắt đầu cuộc trò chuyện bằng cách nhắn tin về sản phẩm
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e1e5e9]">
            {conversations.map((conversation) => (
              <div
                key={conversation.conversationId}
                onClick={() => onSelectConversation(conversation.conversationId)}
                className={`conversation-item p-4 cursor-pointer ${
                  selectedConversationId === conversation.conversationId
                    ? "bg-[#ffffff] border-r-4 border-[#0088cc] shadow-sm"
                    : "bg-[#f8f9fa]"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#ffffff] shadow-sm">
                      <Image
                        src={conversation.product.image || "/demo/dc10.jpg"}
                        alt={conversation.product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Conversation Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium truncate ${
                        selectedConversationId === conversation.conversationId
                          ? "text-[#0088cc]"
                          : "text-[#2c2d30]"
                      }`}>
                        {conversation.product.name}
                      </h3>
                      <span className="text-xs text-[#8e9297]">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessage.timestamp),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-[#8e9297] mt-1">
                      {conversation.lastMessage.sender.firstName}{" "}
                      {conversation.lastMessage.sender.lastName}
                    </p>

                    <p className={`text-sm mt-1 truncate ${
                      selectedConversationId === conversation.conversationId
                        ? "text-[#2c2d30] font-medium"
                        : "text-[#8e9297]"
                    }`}>
                      {conversation.lastMessage.content}
                    </p>

                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="inline-flex items-center justify-center w-5 h-5 bg-[#0088cc] text-white text-xs font-medium rounded-full mt-2 shadow-sm">
                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}