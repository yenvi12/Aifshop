"use client";

import { useState } from "react";
import { MdChat, MdClose } from "react-icons/md";

interface ChatButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
}

export default function ChatButton({ isOpen, onToggle, unreadCount = 0 }: ChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center justify-center
        w-12 h-12 sm:w-14 sm:h-14 rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        transform hover:scale-110 active:scale-95
        ${isOpen
          ? 'bg-brand-dark text-white rotate-45'
          : 'bg-brand-primary text-white hover:bg-brand-primary/90'
        }
        ${isHovered && !isOpen ? 'animate-pulse' : ''}
        chat-button-hover chat-button-mobile
      `}
      aria-label={isOpen ? "Close chat" : "Open chat"}
      aria-expanded={isOpen}
    >
      {/* Glow effect */}
      <div className={`
        absolute inset-0 rounded-full 
        ${isOpen 
          ? 'bg-brand-dark/20' 
          : 'bg-brand-primary/20'
        }
        blur-md animate-pulse
      `} />
      
      {/* Icon */}
      <span className="relative z-10">
        {isOpen ? (
          <MdClose className="w-6 h-6" />
        ) : (
          <MdChat className="w-6 h-6" />
        )}
      </span>
      
      {/* Unread count badge */}
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 
          bg-red-500 text-white text-xs 
          rounded-full h-5 w-5 
          flex items-center justify-center 
          font-medium animate-bounce
          shadow-md
        ">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      
      {/* Tooltip */}
      {!isOpen && (
        <div className={`
          absolute bottom-full right-0 mb-2 
          bg-brand-dark text-white text-sm 
          px-3 py-2 rounded-lg 
          whitespace-nowrap
          transition-all duration-200
          ${isHovered 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-2 pointer-events-none'
          }
        `}>
          <div className="relative">
            Chat với chuyên gia tư vấn
            <div className="absolute top-full right-4 
              w-0 h-0 
              border-l-4 border-l-transparent
              border-r-4 border-r-transparent
              border-t-4 border-t-brand-dark
            " />
          </div>
        </div>
      )}
      
      {/* Ripple effect on click */}
      <span className="absolute inset-0 rounded-full 
        bg-white opacity-0 
        transition-opacity duration-300
        active:opacity-30
      " />
    </button>
  );
}