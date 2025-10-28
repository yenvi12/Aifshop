"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MdMessage, MdShoppingBag } from "react-icons/md";

type Conversation = {
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
    senderId: string;
    receiverId: string;
  };
  unreadCount: number;
  messageCount: number;
};

export default function MessengerIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const checkAuthAndFetchConversations = async () => {
      const token = localStorage.getItem("accessToken");
      
      // Check authentication
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // Fetch conversations
        const response = await fetch("/api/conversations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          // Has conversations - redirect to the most recent one
          const mostRecentConversation = data.data[0];
          router.replace(`/messenger/${mostRecentConversation.conversationId}`);
        } else {
          // No conversations - show empty state
          setConversations([]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        setConversations([]);
        setLoading(false);
      }
    };

    checkAuthAndFetchConversations();
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-[#f8f9fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088cc]"></div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-[#f8f9fa]">
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
            <MdMessage className="w-12 h-12 text-[#0088cc]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[#2c2d30] mb-3">
          Chưa có tin nhắn
        </h1>

        {/* Description */}
        <p className="text-[#8e9297] mb-8">
          Bạn chưa có cuộc trò chuyện nào. Hãy bắt đầu mua sắm và nhắn tin với chúng tôi để được tư vấn về sản phẩm!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push("/shop")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b3] transition-colors font-medium shadow-sm"
          >
            <MdShoppingBag className="w-5 h-5" />
            Khám phá sản phẩm
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2c2d30] border border-[#e1e5e9] rounded-lg hover:bg-[#f8f9fa] transition-colors font-medium"
          >
            Về trang chủ
          </button>
        </div>

        {/* Helper text */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-[#e1e5e9]">
          <p className="text-sm text-[#8e9297]">
            💡 <span className="font-medium text-[#2c2d30]">Mẹo:</span> Khi xem chi tiết sản phẩm, bạn có thể nhấn nút "Nhắn tin" để bắt đầu trò chuyện với đội ngũ hỗ trợ của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}

