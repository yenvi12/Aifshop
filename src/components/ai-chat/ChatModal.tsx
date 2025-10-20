"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MdClose, MdMinimize, MdExpand, MdSmartToy } from "react-icons/md";
import ChatButton from "./ChatButton";
import MessageItem, { Message } from "./MessageItem";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import QuickSuggestions from "./QuickSuggestions";
import toast from "react-hot-toast";
import { useChatAI } from "@/hooks/useChatAI";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    addMessage,
    clearChatHistory,
    suggestions,
    hasHistory
  } = useChatAI({
    maxHistory: 50,
    enablePersistence: true
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize welcome message to prevent recreation
  const welcomeMessage = useMemo(() => ({
    id: 'welcome',
    content: '👋 Xin chào! Tôi là chuyên gia tư vấn trang sức của AIFShop. Tôi có thể giúp bạn tìm kiếm sản phẩm phù hợp, tư vấn size, hay giải đáp bất kỳ câu hỏi nào về trang sức. Bạn cần hỗ trợ gì ạ?',
    role: 'assistant' as const,
    timestamp: new Date()
  }), []);

  // Initialize with welcome message if no history
  useEffect(() => {
    // Only add welcome message if there's no history and modal is open
    if (messages.length === 0 && isOpen) {
      addMessage(welcomeMessage);
    }
  }, [messages.length, addMessage, isOpen, welcomeMessage]);

  // Optimized scroll to bottom with requestAnimationFrame
  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages]);

  // Debounced window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (window.innerWidth < 640 && isOpen) {
          setIsMinimized(false);
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Memoized event handlers
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMessage(content);
      setShowSuggestions(false); // Hide suggestions after sending a message
    } catch (error) {
      // Error is handled by the hook
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  }, [sendMessage]);

  const handleClearHistory = useCallback(() => {
    clearChatHistory();
    setShowSuggestions(true);
    toast.success('Đã xóa lịch sử trò chuyện');
  }, [clearChatHistory]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);


  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 sm:hidden modal-backdrop"
        onClick={handleClose}
      />

      {/* Chat Container */}
      <div className={`
        fixed z-50 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl
        border border-brand-light
        transition-all duration-300 ease-out
        ${isMinimized
          ? 'bottom-20 right-6 w-80 h-14'
          : 'bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 chat-modal-responsive'
        }
        ${isOpen ? 'animate-fade-in-up' : 'animate-fade-out'}
        chat-modal-mobile
      `}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white p-4 rounded-t-2xl sm:rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MdSmartToy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AIFShop AI Assistant</h3>
              <div className="text-xs opacity-90 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                Chuyên gia tư vấn trang sức
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <MdExpand className="w-5 h-5" />
              ) : (
                <MdMinimize className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <MdClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex flex-col h-[calc(100%-60px)]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-brand-light/20 to-white p-4 space-y-2 chat-messages-improved">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              
              {isLoading && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions - Unified */}
            <div className={showSuggestions ? "quick-suggestions quick-suggestions-enter" : ""}>
              <QuickSuggestions
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                hasHistory={hasHistory}
                onClearHistory={handleClearHistory}
              />
            </div>

            {/* Input Area - Fixed */}
            <div className="chat-input-fixed">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder="Nhập câu hỏi của bạn về trang sức..."
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}