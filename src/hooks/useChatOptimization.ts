import { useCallback, useRef, useEffect } from 'react';

interface ChatOptimizationOptions {
  debounceMs?: number;
  maxRetries?: number;
  cacheSize?: number;
}

export function useChatOptimization(options: ChatOptimizationOptions = {}) {
  const {
    debounceMs = 300,
    maxRetries = 3,
    cacheSize = 100
  } = options;

  // Cache for API responses
  const cacheRef = useRef<Map<string, { response: string; timestamp: number }>>(
    new Map()
  );

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Performance metrics
  const metricsRef = useRef({
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0
  });

  // Clean old cache entries (older than 1 hour)
  const cleanCache = useCallback(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, value] of cacheRef.current.entries()) {
      if (now - value.timestamp > oneHour) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  // Limit cache size
  const limitCacheSize = useCallback(() => {
    if (cacheRef.current.size > cacheSize) {
      const entries = Array.from(cacheRef.current.entries());
      // Sort by timestamp and remove oldest
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - cacheSize);
      toRemove.forEach(([key]) => cacheRef.current.delete(key));
    }
  }, [cacheSize]);

  // Generate cache key from message and context
  const generateCacheKey = useCallback((message: string, context: string = '') => {
    // Simple hash function for cache key
    const combined = `${message}:${context}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }, []);

  // Debounced function
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ) => {
    return (...args: Parameters<T>) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }, []);

  // Optimized chat API call with caching and retry logic
  const optimizedChatCall = useCallback(async (
    message: string,
    context: string = '',
    retryCount = 0
  ): Promise<string> => {
    const startTime = performance.now();
    metricsRef.current.totalRequests++;
    
    console.log(`optimizedChatCall called with message: "${message}", context: "${context}", retryCount: ${retryCount}`);

    try {
      // Check cache first
      const cacheKey = generateCacheKey(message, context);
      const cached = cacheRef.current.get(cacheKey);
      
      if (cached) {
        metricsRef.current.cacheHits++;
        // Ensure cached response is not undefined
        if (!cached.response || cached.response.trim() === '') {
          console.error('Cached response is empty or invalid:', cached.response);
          cacheRef.current.delete(cacheKey); // Remove invalid cache entry
          // Continue to make a fresh API call
        } else {
          return cached.response;
        }
      }

      // Make API call
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ message, conversationHistory: [] })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (!data.success) {
        console.error('API returned unsuccessful response:', data);
        throw new Error(data.error || 'API returned error');
      }

      // Check if response is empty or undefined
      if (data.response === undefined) {
        console.error('API returned undefined response:', data);
        throw new Error('API returned undefined response');
      }
      
      if (!data.response || data.response.trim() === '') {
        console.error('API returned empty response:', data);
        throw new Error('API returned empty response');
      }

      // Cache the response
      cacheRef.current.set(cacheKey, {
        response: data.response,
        timestamp: Date.now()
      });

      // Clean cache periodically
      cleanCache();
      limitCacheSize();

      // Update metrics
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      metricsRef.current.successfulRequests++;
      
      // Update average response time
      const total = metricsRef.current.successfulRequests;
      metricsRef.current.averageResponseTime = 
        (metricsRef.current.averageResponseTime * (total - 1) + responseTime) / total;

      // Final check to ensure we're not returning undefined
      if (!data.response || data.response.trim() === '') {
        throw new Error('API returned empty response');
      }
      
      return data.response;

    } catch (error) {
      console.error(`Chat API call failed (retry ${retryCount}/${maxRetries}):`, error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.warn(`Retrying chat API call (${retryCount + 1}/${maxRetries})`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return optimizedChatCall(message, context, retryCount + 1);
      }

      console.error('All retries exhausted, throwing error:', error);
      throw error;
    }
  }, [generateCacheKey, cleanCache, limitCacheSize, maxRetries]);

  // Debounced chat call
  const debouncedChatCall = useCallback(
    debounce(async (message: string, context?: string) => {
      console.log('debouncedChatCall executing with:', { message, context });
      const result = await optimizedChatCall(message, context || '');
      console.log('debouncedChatCall result:', result);
      return result;
    }, debounceMs) as (message: string, context?: string) => Promise<string>,
    [optimizedChatCall, debounceMs, debounce]
  );

  // Get performance metrics
  const getMetrics = useCallback(() => {
    const successRate = metricsRef.current.totalRequests > 0 
      ? (metricsRef.current.successfulRequests / metricsRef.current.totalRequests) * 100 
      : 0;
    
    const cacheHitRate = metricsRef.current.totalRequests > 0
      ? (metricsRef.current.cacheHits / metricsRef.current.totalRequests) * 100
      : 0;

    return {
      ...metricsRef.current,
      successRate: Math.round(successRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheSize: cacheRef.current.size
    };
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    metricsRef.current.cacheHits = 0;
  }, []);

  // Preload common responses
  const preloadCommonResponses = useCallback(async () => {
    const commonQueries = [
      'Xin chào',
      'Tư vấn size nhẫn',
      'Gợi ý sản phẩm',
      'Bảo quản trang sức'
    ];

    // Preload in background without blocking
    commonQueries.forEach(query => {
      setTimeout(() => {
        optimizedChatCall(query).catch(() => {
          // Ignore errors during preload
        });
      }, Math.random() * 5000); // Random delay to avoid overwhelming
    });
  }, [optimizedChatCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    optimizedChatCall: optimizedChatCall, // Temporarily using non-debounced version
    getMetrics,
    clearCache,
    preloadCommonResponses,
    cacheSize: cacheRef.current.size
  };
}