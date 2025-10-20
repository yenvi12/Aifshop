import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/components/ai-chat';
import { useChatOptimization } from './useChatOptimization';

const CHAT_STORAGE_KEY = 'aifshop_chat_history';
const MAX_CHAT_HISTORY = 50;

interface UseChatAIOptions {
  maxHistory?: number;
  enablePersistence?: boolean;
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
  const sendMessage = useCallback(async (content: string) => {
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

      // Use optimized chat call with caching and retry logic
      console.log('Calling optimizedChatCall with:', { content, context });
      const aiResponse = await optimizedChatCall(content, context);
      console.log('Received response from optimizedChatCall:', aiResponse);

      // Add AI response
      console.log('Adding AI response to chat:', aiResponse);
      if (!aiResponse || aiResponse.trim() === '') {
        console.error('AI response is empty or invalid:', aiResponse);
        // Use a fallback response instead of the empty/undefined one
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
        // Don't set error state for abort errors
        // Don't add error message for abort errors
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
  }, [messages, addMessage, optimizedChatCall]);

  // Get predefined jewelry-specific suggestions
  const getJewelrySuggestions = useCallback(() => {
    return [
      {
        id: 'ring-sizing',
        text: 'Tư vấn size nhẫn',
        action: () => sendMessage('Tư vấn size nhãn cho tôi. Tôi không biết size nhẫn của mình.')
      },
      {
        id: 'necklace-guide',
        text: 'Chọn dây chuyền',
        action: () => sendMessage('Giúp tôi chọn dây chuyền phù hợp với phong cách của tôi.')
      },
      {
        id: 'diamond-advice',
        text: 'Tư vấn kim cương',
        action: () => sendMessage('Tôi muốn tìm hiểu về kim cương và cách chọn kim cương tốt.')
      },
      {
        id: 'gift-ideas',
        text: 'Quà tặng trang sức',
        action: () => sendMessage('Tôi cần tư vấn quà tặng trang sức cho người thân.')
      },
      {
        id: 'care-tips',
        text: 'Bảo quản trang sức',
        action: () => sendMessage('Hướng dẫn tôi cách bảo quản trang sức đúng cách.')
      },
      {
        id: 'price-guide',
        text: 'Tư vấn giá cả',
        action: () => sendMessage('Tư vấn cho tôi về giá cả các loại trang sức.')
      }
    ];
  }, [sendMessage]);

  // Get contextual suggestions based on current conversation
  const getContextualSuggestions = useCallback(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Debug logging
    console.log('getContextualSuggestions - lastMessage:', lastMessage);
    console.log('getContextualSuggestions - messages length:', messages.length);
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      console.log('Returning default jewelry suggestions');
      return getJewelrySuggestions();
    }

    // Check if content exists before trying to call toLowerCase()
    if (!lastMessage.content || lastMessage.content.trim() === '') {
      console.error('Last message has no content:', lastMessage);
      // Try to fix the message by adding default content
      if (lastMessage.content === '' || lastMessage.content === undefined) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].id === lastMessage.id) {
            updated[lastIdx] = {
              ...lastMessage,
              content: 'Tin nhắn trống. Vui lòng thử lại.'
            };
            saveChatHistory(updated);
          }
          return updated;
        });
      }
      return getJewelrySuggestions();
    }

    const lastAIResponse = lastMessage.content.toLowerCase();
    
    // Analyze AI response to provide relevant follow-up suggestions
    if (lastAIResponse.includes('nhẫn') || lastAIResponse.includes('size')) {
      return [
        {
          id: 'measure-ring',
          text: 'Cách đo size nhẫn',
          action: () => sendMessage('Hướng dẫn chi tiết cách đo size nhẫn tại nhà')
        },
        {
          id: 'ring-materials',
          text: 'Chất liệu nhẫn',
          action: () => sendMessage('Các chất liệu làm nhẫn phổ biến và ưu nhược điểm')
        }
      ];
    }

    if (lastAIResponse.includes('dây chuyền') || lastAIResponse.includes('necklace')) {
      return [
        {
          id: 'necklace-length',
          text: 'Độ dài dây chuyền',
          action: () => sendMessage('Tư vấn chọn độ dài dây chuyền phù hợp')
        },
        {
          id: 'necklace-style',
          text: 'Phong cách dây chuyền',
          action: () => sendMessage('Các phong cách dây chuyền đang thịnh hành')
        }
      ];
    }

    return getJewelrySuggestions();
  }, [messages, getJewelrySuggestions]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    addMessage,
    clearChatHistory,
    suggestions: getContextualSuggestions(),
    hasHistory: messages.length > 1
  };
}