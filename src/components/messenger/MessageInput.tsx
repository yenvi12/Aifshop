"use client";

import { useState, useRef, useEffect } from "react";
import { MdSend } from "react-icons/md";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled: boolean;
  isTyping?: boolean;
}

export default function MessageInput({
  onSendMessage,
  disabled,
  isTyping = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-[#e1e5e9] bg-white p-4">
      {/* Typing Indicator */}
      {isTyping && (
        <div className="text-xs text-[#8e9297] mb-2">
          Đang gõ...
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            className="w-full px-4 py-3 pr-12 border border-[#e1e5e9] rounded-2xl resize-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent bg-[#f8f9fa] text-[#2c2d30] placeholder-[#8e9297] transition-all duration-200"
            rows={1}
            disabled={disabled}
            style={{
              minHeight: "44px",
              maxHeight: "120px",
              scrollbarWidth: "thin",
              scrollbarColor: "#8e9297 transparent"
            }}
            aria-label="Nhập tin nhắn của bạn"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 bg-[#0088cc] hover:bg-[#0077b3] disabled:bg-[#e1e5e9] disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-[#0088cc] focus:ring-offset-2 shadow-sm"
          aria-label="Gửi tin nhắn"
        >
          {disabled ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <MdSend className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}