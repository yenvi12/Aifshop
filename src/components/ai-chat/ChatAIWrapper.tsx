"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import ChatModal from "./ChatModal";
import ChatButton from "./ChatButton";

export default function ChatAIWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Hide chat on certain pages
  const hideChatPaths = ['/login', '/register'];
  const shouldHideChat = hideChatPaths.includes(pathname);

  const toggleChat = () => {
    if (!isOpen) {
      setUnreadCount(0); // Reset unread count when opening chat
    }
    setIsOpen(!isOpen);
  };
  
  const closeChat = () => setIsOpen(false);

  if (shouldHideChat) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <ChatModal
          isOpen={isOpen}
          onClose={closeChat}
        />
      ) : (
        <ChatButton
          isOpen={false}
          onToggle={toggleChat}
          unreadCount={unreadCount}
        />
      )}
    </>
  );
}