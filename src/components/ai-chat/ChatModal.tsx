"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MdClose, MdMinimize, MdExpand, MdSmartToy, MdDiamond, MdStraighten } from "react-icons/md";
import ChatButton from "./ChatButton";
import MessageItem, { Message } from "./MessageItem";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import QuickSuggestions from "./QuickSuggestions";
import toast from "react-hot-toast";
import { useChatAI } from "@/hooks/useChatAI";

type SizeOption = {
  name: string;
  stock: number;
};

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function ChatModal({ isOpen, onClose, productContext }: ChatModalProps) {
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
  const welcomeMessage = useMemo(() => {
    if (productContext) {
      return {
        id: 'welcome-product',
        content: `👋 Xin chào! Tôi là chuyên gia tư vấn cho sản phẩm **${productContext.productName}**.

Tôi có thể giúp bạn:
• Tư vấn chi tiết về sản phẩm này
• Gợi ý size phù hợp
• So sánh với các sản phẩm tương tự
• Tư vấn cách phối đồ và bảo quản

Bạn muốn biết gì về sản phẩm này?`,
        role: 'assistant' as const,
        timestamp: new Date()
      };
    }
    
    return {
      id: 'welcome',
      content: '👋 Xin chào! Tôi là chuyên gia tư vấn trang sức của AIFShop. Tôi có thể giúp bạn tìm kiếm sản phẩm phù hợp, tư vấn size, hay giải đáp bất kỳ câu hỏi nào về trang sức. Bạn cần hỗ trợ gì ạ?',
      role: 'assistant' as const,
      timestamp: new Date()
    };
  }, [productContext]);

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
      // Pass product context to sendMessage if available
      await sendMessage(content, productContext?.productId);
      setShowSuggestions(false); // Hide suggestions after sending a message
    } catch (error) {
      // Error is handled by the hook
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  }, [sendMessage, productContext?.productId]);

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
        fixed z-50 bg-white shadow-2xl
        border border-brand-light
        transition-all duration-300 ease-out
        chat-modal-container
        ${isMinimized
          ? 'bottom-20 right-6 w-80 h-14 chat-modal-minimized'
          : productContext
            ? 'bottom-4 right-0 sm:bottom-8 sm:right-6 w-full sm:w-96 chat-modal-responsive-with-context'
            : 'bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 chat-modal-responsive'
        }
        ${isOpen ? 'animate-fade-in-up' : 'animate-fade-out'}
        ${isMinimized
          ? 'chat-modal-mobile chat-modal-minimized'
          : 'chat-modal-mobile chat-modal-expanded'
        }
        ${!isMinimized ? 'chat-modal-desktop chat-modal-expanded' : 'chat-modal-desktop chat-modal-minimized'}
      `}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white p-4 flex items-center justify-between header-rounded chat-modal-header-fixed chat-modal-header-container">
          <div className="flex items-center gap-3 min-w-0 flex-1 chat-modal-title-section">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MdSmartToy className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm">AIFShop AI Assistant</h3>
              <div className="text-xs opacity-90 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-[240px] chat-modal-title-truncate">
                  {productContext ? `Đang tư vấn: ${productContext.productName}` : 'Chuyên gia tư vấn trang sức'}
                </span>
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

        {/* Product preview bar (only show when productContext exists) */}
        {productContext && !isMinimized && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 mx-4 mt-2 border border-white/20">
            {productContext.productImage && (
              <img
                src={productContext.productImage}
                alt={productContext.productName}
                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{productContext.productName}</div>
              <div className="text-xs sm:text-sm font-medium text-brand-primary">
                {productContext.productPrice
                  ? `${productContext.productPrice.toLocaleString('vi-VN')}₫`
                  : productContext.productCompareAtPrice
                  ? `${productContext.productCompareAtPrice.toLocaleString('vi-VN')}₫`
                  : 'Liên hệ'
                }
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSendMessage('Tư vấn chi tiết về sản phẩm này')}
                className="p-1.5 sm:p-2 bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg transition-colors"
                title="Chi tiết sản phẩm"
              >
                <MdDiamond className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
              </button>
              <button
                onClick={() => handleSendMessage('Tư vấn size phù hợp')}
                className="p-1.5 sm:p-2 bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg transition-colors"
                title="Tư vấn size"
              >
                <MdStraighten className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!isMinimized && (
          <div className={`flex flex-col ${productContext ? 'h-[calc(100%-120px)] sm:h-[calc(100%-130px)]' : 'h-[calc(100%-60px)]'}`}>
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
                placeholder={productContext ? `Hỏi về ${productContext.productName}...` : "Nhập câu hỏi của bạn về trang sức..."}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}