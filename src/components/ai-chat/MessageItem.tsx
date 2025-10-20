"use client";

import { useEffect, useRef } from "react";
import { MdPerson, MdSmartToy } from "react-icons/md";

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface MessageItemProps {
  message: Message;
  isTyping?: boolean;
}

export default function MessageItem({ message, isTyping = false }: MessageItemProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [message.content]);

  const isUser = message.role === 'user';
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isTyping) {
    return (
      <div className="flex items-start gap-3 px-4 py-2 animate-fade-in-up">
        {/* AI Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
          <MdSmartToy className="w-4 h-4 text-white" />
        </div>
        
        {/* Typing indicator placeholder */}
        <div className="bg-brand-light/60 rounded-2xl rounded-tl-none px-4 py-3 max-w-xs">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-1" />
            <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-2" />
            <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messageRef}
      className={`
        flex items-start gap-3 px-4 py-2
        animate-message-slide
        ${isUser ? 'flex-row-reverse' : ''}
      `}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full 
        flex items-center justify-center
        ${isUser 
          ? 'bg-brand-primary text-white' 
          : 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white'
        }
      `}>
        {isUser ? (
          <MdPerson className="w-4 h-4" />
        ) : (
          <MdSmartToy className="w-4 h-4" />
        )}
      </div>
      
      {/* Message bubble */}
      <div className={`
        max-w-xs sm:max-w-md lg:max-w-lg
        rounded-2xl px-4 py-3
        shadow-sm hover:shadow-md
        transition-shadow duration-200
        message-bubble-${isUser ? 'own' : 'other'}
        ${isUser 
          ? 'bg-brand-primary text-white rounded-tr-none' 
          : 'bg-brand-light/60 text-brand-dark rounded-tl-none border border-brand-light'
        }
      `}>
        {/* Message content */}
        <p className={`
          text-sm leading-relaxed
          ${isUser ? 'text-white' : 'text-brand-dark'}
        `}>
          {message.content}
        </p>
        
        {/* Timestamp */}
        <div className={`
          mt-1 text-xs opacity-70
          ${isUser ? 'text-right' : 'text-left'}
        `}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
}