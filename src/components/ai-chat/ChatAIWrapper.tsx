"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ChatModal from "./ChatModal";
import ChatButton from "./ChatButton";
import { useChat } from "@/contexts/ChatContext";

type SizeOption = {
  name: string;
  stock: number;
};

interface ChatAIWrapperProps {
  productContext?: {
    productId: string;
    productName: string;
    productPrice: number | null;
    productCompareAtPrice: number | null;
    productCategory: string;
    productImage?: string;
    productDescription?: string;
    productSizes?: SizeOption[];
  };
}

export default function ChatAIWrapper({ productContext: propProductContext }: ChatAIWrapperProps = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const { isOpen, productContext: contextProductContext, openChat, closeChat } = useChat();

  // Hide chat on certain pages
  const hideChatPaths = ['/login', '/register'];
  const shouldHideChat = hideChatPaths.includes(pathname) || pathname.startsWith('/messenger');

  const toggleChat = () => {
    if (!isOpen) {
      setUnreadCount(0); // Reset unread count when opening chat
    }
    
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  // Auto-open modal when productContext is provided via props
  useEffect(() => {
    if (propProductContext && !isOpen) {
      openChat(propProductContext);
    }
  }, [propProductContext, isOpen, openChat]);

  if (shouldHideChat) {
    return null;
  }

  // Always use the context state, not local state
  const currentProductContext = propProductContext || contextProductContext;

  return (
    <>
      {isOpen ? (
        <ChatModal
          isOpen={isOpen}
          onClose={closeChat}
          productContext={currentProductContext || undefined}
        />
      ) : (
        // Only show button when there's no productContext prop
        !propProductContext && (
          <ChatButton
            isOpen={false}
            onToggle={toggleChat}
            unreadCount={unreadCount}
          />
        )
      )}
    </>
  );
}