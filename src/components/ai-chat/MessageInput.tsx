"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MdSend } from "react-icons/md";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Nhập tin nhắn của bạn..." 
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-resize textarea
  useEffect(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.min(scrollHeight, 96)}px`; // Reduced max height
      }
    }, 16); // ~60fps

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [message]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    
    onSendMessage(message.trim());
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="p-3">
      <div className="flex items-center gap-2">
        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full px-3 py-2.5 pr-10
              bg-gray-50 border border-gray-200
              rounded-xl resize-none
              focus:outline-none focus:ring-2 focus:ring-brand-primary/30
              focus:border-brand-primary focus:bg-white
              transition-all duration-200 text-sm placeholder-gray-400 input-improved
              ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white hover:border-gray-300'
              }
              max-h-24
            `}
            aria-label="Message input"
          />
          
          {/* Character count */}
          {message.length > 100 && (
            <div className="absolute bottom-1.5 right-2 text-xs text-gray-400 opacity-70">
              {message.length}/500
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={`
            flex-shrink-0 w-9 h-9 rounded-xl
            flex items-center justify-center
            transition-all duration-200 btn-interaction
            ${disabled || !message.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm hover:shadow-md'
            }
          `}
          aria-label="Send message"
        >
          <MdSend className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}