"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ConversationList from "../../../components/messenger/ConversationList";
import MessageList from "../../../components/messenger/MessageList";
import MessageInput from "../../../components/messenger/MessageInput";
import toast from "react-hot-toast";

type Message = {
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
};

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
  };
  unreadCount: number;
  messageCount: number;
};

export default function MessengerPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string>(conversationId);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get current user info
  useEffect(() => {
    const getUserInfo = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserId(payload.userId);
        setUserRole(payload.role);
      } catch (error) {
        console.error("Error parsing token:", error);
        router.push("/login");
      }
    };

    getUserInfo();
  }, [router]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  // Fetch messages for current conversation
  const fetchMessages = async (convId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/messages?conversationId=${convId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
        // Extract product info from first message
        if (data.data.length > 0) {
          setProductInfo(data.data[0].product);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedConversation || !userId) return;

    setSending(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      // Extract productId from conversationId (format: userId-productId)
      const productId = selectedConversation.split("-")[1];
      if (!productId) throw new Error("Invalid conversation");

      // Determine receiver based on user role
      // For USER: send to any ADMIN
      // For ADMIN: send to the USER in the conversation
      let receiverId = "";
      if (userRole === "USER") {
        // Always find an ADMIN user for USER to send to
        try {
          const adminResponse = await fetch("/api/users?role=ADMIN&limit=1&forMessaging=true", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const adminData = await adminResponse.json();
          if (adminData.success && adminData.data.length > 0) {
            receiverId = adminData.data[0].id;
          } else {
            throw new Error("No admin users found");
          }
        } catch (error) {
          console.error("Error finding admin:", error);
          throw new Error("Cannot find admin to send message to");
        }
      } else {
        // ADMIN sending to USER - get USER ID from conversation
        const userIdFromConv = selectedConversation.split("-")[0];
        if (userIdFromConv && userIdFromConv !== userId) {
          receiverId = userIdFromConv;
        } else {
          throw new Error("Invalid conversation for admin");
        }
      }

      if (!receiverId) {
        throw new Error("No receiver found");
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          receiverId,
          productId,
          content: content.trim(),
        }),
      });

      const data = await response.json();
      console.log('Send message response:', data);
      if (data.success) {
        // Message will be added via real-time listener
        // Optimistically add to local state
        const newMessage = data.data;
        setMessages(prev => [...prev, newMessage]);

        // Dispatch event to update header badges
        window.dispatchEvent(new CustomEvent('messageUpdated'));
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (convId: string) => {
    setSelectedConversation(convId);
    fetchMessages(convId);
    // Update URL
    router.push(`/messenger/${convId}`, { scroll: false });
    // Close sidebar on mobile
    setSidebarOpen(false);
  };

  // Setup real-time listener
  useEffect(() => {
    if (!selectedConversation || !userId) return;

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversationId=eq.${selectedConversation}`,
        },
        (payload) => {
          console.log("New message:", payload);
          // Add new message to state if it's not from current user
          if (payload.new.senderId !== userId) {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Dispatch event to update header badges
      window.dispatchEvent(new CustomEvent('messageUpdated'));
    };
  }, [selectedConversation, userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchConversations();
      if (conversationId) {
        fetchMessages(conversationId);
      }
      setLoading(false);
    }
  }, [userId, conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088cc]"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#f8f9fa]" onClick={() => setSidebarOpen(false)}>
      {/* Sidebar - Conversations */}
      <div className={`w-80 bg-white border-r border-[#e1e5e9] flex flex-col shadow-sm md:relative fixed md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:z-auto z-50 transition-transform duration-300`} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[#e1e5e9] bg-white">
          <h1 className="text-xl font-semibold text-[#2c2d30]">
            Tin nhắn
          </h1>
          {productInfo && (
            <p className="text-sm text-[#8e9297] mt-1">
              Về sản phẩm: {productInfo.name}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f8f9fa]">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversation}
            onSelectConversation={handleConversationSelect}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white md:ml-0" onClick={() => setSidebarOpen(false)}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#e1e5e9] bg-white">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                  aria-label="Mở danh sách cuộc trò chuyện"
                >
                  <svg className="w-5 h-5 text-[#2c2d30]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {productInfo && (
                  <>
                    <img
                      src={productInfo.image || "/demo/dc10.jpg"}
                      alt={productInfo.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold text-[#2c2d30]">
                        {productInfo.name}
                      </h2>
                      <p className="text-sm text-[#8e9297]">
                        Thảo luận sản phẩm
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa]">
              <MessageList
                messages={messages}
                loading={loading}
                currentUserId={userId || ""}
              />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-[#e1e5e9] bg-white">
              <MessageInput
                onSendMessage={sendMessage}
                disabled={sending}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#8e9297] bg-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
                💬
              </div>
              <p>Chọn cuộc trò chuyện để bắt đầu nhắn tin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}