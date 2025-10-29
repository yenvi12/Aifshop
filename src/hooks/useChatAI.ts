import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/components/ai-chat';
import { useChatOptimization } from './useChatOptimization';

const CHAT_STORAGE_KEY = 'aifshop_chat_history';
const MAX_CHAT_HISTORY = 50;

interface UseChatAIOptions {
  maxHistory?: number;
  enablePersistence?: boolean;
  productContext?: {
    productId: string;
    productName: string;
    productCategory: string;
  };
}

export interface Suggestion {
  id: string;
  text: string;
  action: () => void;
  icon?: string;
  category?: 'product' | 'conversation' | 'general';
  priority?: number; // Lower number = higher priority (1 = product, 2 = conversation, 3 = general)
}

export function useChatAI(options: UseChatAIOptions = {}) {
  const {
    maxHistory = MAX_CHAT_HISTORY,
    enablePersistence = true
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance optimization
  const { optimizedChatCall, preloadCommonResponses } = useChatOptimization({
    debounceMs: 300,
    maxRetries: 2,
    cacheSize: 50
  });

  // Load chat history from localStorage
  useEffect(() => {
    if (!enablePersistence) return;

    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        // Convert string timestamps back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => {
          console.log('Loading message from storage:', msg);
          // Validate content when loading from storage
          if (!msg.content || msg.content.trim() === '') {
            console.error('Loaded message with empty content from storage:', msg);
            msg.content = 'Tin nhắn trống. Vui lòng thử lại.';
          }
          return {
            ...msg,
            timestamp: new Date(msg.timestamp)
          };
        });
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [enablePersistence]);

  // Save chat history to localStorage
  const saveChatHistory = useCallback((chatMessages: Message[]) => {
    if (!enablePersistence) return;

    try {
      const messagesToSave = chatMessages.slice(-maxHistory);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [enablePersistence, maxHistory]);

  // Add message to chat
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    console.log('addMessage called with:', message);
    
    // Validate message content
    if (!message.content || message.content.trim() === '') {
      console.error('Attempted to add message with empty content:', message);
      // Set a default content if empty
      message.content = 'Tin nhắn trống. Vui lòng thử lại.';
    }
    
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    console.log('Created new message:', newMessage);

    setMessages(prev => {
      const updated = [...prev, newMessage];
      saveChatHistory(updated);
      return updated;
    });

    return newMessage;
  }, [saveChatHistory]);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    setMessages([]);
    if (enablePersistence) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, [enablePersistence]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string, productId?: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage = addMessage({
      content: content.trim(),
      role: 'user'
    });

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Vui lòng đăng nhập để sử dụng chat AI');
      }

      // Generate context for caching
      const context = messages.slice(-3).map(msg => msg.content).join('|');
      console.log('Generated context for caching:', context);
      console.log('Sending productId to API:', productId);

      // Call AI API directly with product context
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages,
          productId: productId,
          context: productId ? 'product-specific' : 'general'
        })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối với AI');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI response failed');
      }

      const aiResponse = data.response;
      console.log('Received AI response:', aiResponse);

      // Add AI response
      if (!aiResponse || aiResponse.trim() === '') {
        console.error('AI response is empty or invalid:', aiResponse);
        const fallbackResponse = 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.';
        addMessage({
          content: fallbackResponse,
          role: 'assistant'
        });
        return fallbackResponse;
      }

      addMessage({
        content: aiResponse,
        role: 'assistant'
      });

      return aiResponse;
    } catch (err) {
      console.error('Error in sendMessage:', err);
      
      // Handle AbortError specifically - don't show error to user
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request was aborted, not showing error to user');
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      
      // Only set error and show fallback message for non-abort errors
      setError(errorMessage);
      
      // Add error message from AI
      const fallbackMessage = 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ nhanh nhất.';
      console.log('Adding error message to chat:', fallbackMessage);
      addMessage({
        content: fallbackMessage,
        role: 'assistant'
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [messages, addMessage]);

  // Get product-specific suggestions when productContext is available
  const getProductSuggestions = useCallback((): Suggestion[] => {
    if (!options.productContext) return [];
    
    const { productName, productCategory } = options.productContext;
    return [
      {
        id: 'product-detail',
        text: `Chi tiết ${productName}`,
        action: () => sendMessage(`Tư vấn chi tiết về ${productName}`),
        icon: '💎',
        category: 'product',
        priority: 1
      },
      {
        id: 'product-size',
        text: 'Tư vấn size phù hợp',
        action: () => sendMessage(`Tư vấn size phù hợp cho ${productName}`),
        icon: '📏',
        category: 'product',
        priority: 1
      },
      {
        id: 'product-compare',
        text: 'So sánh sản phẩm tương tự',
        action: () => sendMessage(`Cho tôi xem các sản phẩm tương tự với ${productName}`),
        icon: '🔍',
        category: 'product',
        priority: 1
      },
      {
        id: 'product-care',
        text: 'Cách bảo quản',
        action: () => sendMessage(`Hướng dẫn cách bảo quản ${productName}`),
        icon: '✨',
        category: 'product',
        priority: 1
      },
      {
        id: 'product-styling',
        text: 'Cách phối đồ',
        action: () => sendMessage(`Tư vấn cách phối đồ với ${productName}`),
        icon: '👗',
        category: 'product',
        priority: 1
      }
    ];
  }, [options.productContext, sendMessage]);

  // Get conversation-aware suggestions based on recent messages
  const getConversationSuggestions = useCallback((): Suggestion[] => {
    if (messages.length === 0) return [];
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content) {
      return [];
    }

    const content = lastMessage.content.toLowerCase();
    const suggestions: Suggestion[] = [];

    // Size/ring related
    if (content.includes('nhẫn') || content.includes('size')) {
      suggestions.push(
        {
          id: 'measure-ring',
          text: 'Cách đo size nhẫn',
          action: () => sendMessage('Hướng dẫn chi tiết cách đo size nhẫn tại nhà'),
          icon: '📐',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'ring-materials',
          text: 'Chất liệu nhẫn',
          action: () => sendMessage('Các chất liệu làm nhẫn phổ biến và ưu nhược điểm'),
          icon: '💍',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'size-conversion',
          text: 'Bảng quy đổi size',
          action: () => sendMessage('Cho tôi xem bảng quy đổi size nhẫn quốc tế'),
          icon: '📊',
          category: 'conversation',
          priority: 2
        }
      );
    }

    // Necklace related
    if (content.includes('dây chuyền') || content.includes('necklace')) {
      suggestions.push(
        {
          id: 'necklace-length',
          text: 'Độ dài dây chuyền',
          action: () => sendMessage('Tư vấn chọn độ dài dây chuyền phù hợp'),
          icon: '📿',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'necklace-style',
          text: 'Phong cách dây chuyền',
          action: () => sendMessage('Các phong cách dây chuyền đang thịnh hành'),
          icon: '✨',
          category: 'conversation',
          priority: 2
        }
      );
    }

    // Product listing related
    if (content.includes('danh sách sản phẩm') || content.includes('sản phẩm đang có')) {
      suggestions.push(
        {
          id: 'category-products',
          text: 'Xem theo danh mục',
          action: () => sendMessage('Cho tôi xem sản phẩm theo từng danh mục riêng'),
          icon: '📂',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'price-range',
          text: 'Theo khoảng giá',
          action: () => sendMessage('Tôi muốn tìm sản phẩm trong khoảng giá cụ thể'),
          icon: '💰',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'new-products',
          text: 'Sản phẩm mới',
          action: () => sendMessage('Cho tôi xem các sản phẩm mới nhất'),
          icon: '🆕',
          category: 'conversation',
          priority: 2
        }
      );
    }

    // Price related
    if (content.includes('giá') || content.includes('giá cả')) {
      suggestions.push(
        {
          id: 'payment-methods',
          text: 'Phương thức thanh toán',
          action: () => sendMessage('Cho tôi biết các phương thức thanh toán'),
          icon: '💳',
          category: 'conversation',
          priority: 2
        },
        {
          id: 'discount-policy',
          text: 'Chính sách giảm giá',
          action: () => sendMessage('Cho tôi biết chính sách giảm giá hiện tại'),
          icon: '🎁',
          category: 'conversation',
          priority: 2
        }
      );
    }

    return suggestions;
  }, [messages, sendMessage]);

  // Get default/general suggestions
  const getDefaultSuggestions = useCallback((): Suggestion[] => {
    return [
      {
        id: 'product-listing',
        text: 'Xem tất cả sản phẩm',
        action: () => sendMessage('Cho tôi xem danh sách tất cả sản phẩm đang có.'),
        icon: '🛍️',
        category: 'general',
        priority: 3
      },
      {
        id: 'ring-sizing',
        text: 'Tư vấn size nhẫn',
        action: () => sendMessage('Tư vấn size nhẫn cho tôi. Tôi không biết size nhẫn của mình.'),
        icon: '💍',
        category: 'general',
        priority: 3
      },
      {
        id: 'necklace-guide',
        text: 'Chọn dây chuyền',
        action: () => sendMessage('Giúp tôi chọn dây chuyền phù hợp với phong cách của tôi.'),
        icon: '📿',
        category: 'general',
        priority: 3
      },
      {
        id: 'order-history',
        text: 'Lịch sử đơn hàng',
        action: () => sendMessage('Tôi muốn xem lịch sử đơn hàng của mình.'),
        icon: '📦',
        category: 'general',
        priority: 3
      },
      {
        id: 'care-tips',
        text: 'Bảo quản trang sức',
        action: () => sendMessage('Hướng dẫn tôi cách bảo quản trang sức đúng cách.'),
        icon: '✨',
        category: 'general',
        priority: 3
      },
      {
        id: 'gift-ideas',
        text: 'Quà tặng trang sức',
        action: () => sendMessage('Tôi cần tư vấn quà tặng trang sức cho người thân.'),
        icon: '🎁',
        category: 'general',
        priority: 3
      }
    ];
  }, [sendMessage]);

  // Smart suggestions generator - combines product context, conversation context, and defaults
  // Always returns 4-6 suggestions sorted by priority to ensure consistent UI
  const getSmartSuggestions = useCallback((): Suggestion[] => {
    const allSuggestions: Suggestion[] = [];
    const usedIds = new Set<string>();

    // Priority 1: Product-specific suggestions (if available)
    const productSuggestions = getProductSuggestions();
    if (productSuggestions.length > 0) {
      // Take 2-3 product suggestions
      productSuggestions.slice(0, 3).forEach(suggestion => {
        if (!usedIds.has(suggestion.id)) {
          allSuggestions.push(suggestion);
          usedIds.add(suggestion.id);
        }
      });
    }

    // Priority 2: Conversation-aware suggestions (if there's conversation)
    const conversationSuggestions = getConversationSuggestions();
    if (conversationSuggestions.length > 0) {
      // Take 2-3 conversation suggestions
      conversationSuggestions.slice(0, 3).forEach(suggestion => {
        if (!usedIds.has(suggestion.id) && allSuggestions.length < 6) {
          allSuggestions.push(suggestion);
          usedIds.add(suggestion.id);
        }
      });
    }

    // Priority 3: Fill with default suggestions to ensure minimum 4 suggestions
    const defaultSuggestions = getDefaultSuggestions();
    defaultSuggestions.forEach(suggestion => {
      if (!usedIds.has(suggestion.id) && allSuggestions.length < 6) {
        allSuggestions.push(suggestion);
        usedIds.add(suggestion.id);
      }
    });

    // Sort by priority (lower number = higher priority), then take top 6
    const sorted = allSuggestions.sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      return priorityA - priorityB;
    });

    // Always return at least 4 suggestions, maximum 6
    return sorted.slice(0, 6);
  }, [getProductSuggestions, getConversationSuggestions, getDefaultSuggestions]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    addMessage,
    clearChatHistory,
    suggestions: getSmartSuggestions(),
    hasHistory: messages.length > 1
  };
}