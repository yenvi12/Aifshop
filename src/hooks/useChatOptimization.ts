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

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Request ID to track current request
  const requestIdRef = useRef<string | null>(null);

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
    const currentRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    requestIdRef.current = currentRequestId;
    metricsRef.current.totalRequests++;
    
    console.log(`optimizedChatCall [${currentRequestId}] started with message: "${message}", context: "${context}", retryCount: ${retryCount}`);

    try {
      // Check cache first
      const cacheKey = generateCacheKey(message, context);
      const cached = cacheRef.current.get(cacheKey);
      
      if (cached) {
        metricsRef.current.cacheHits++;
        // Ensure cached response is not undefined
        if (!cached.response || cached.response.trim() === '') {
          console.error(`[${currentRequestId}] Cached response is empty or invalid:`, cached.response);
          cacheRef.current.delete(cacheKey); // Remove invalid cache entry
          // Continue to make a fresh API call
        } else {
          console.log(`[${currentRequestId}] Returning cached response`);
          return cached.response;
        }
      }

      // Cancel previous request if still running
      if (abortControllerRef.current) {
        console.log(`[${currentRequestId}] Canceling previous request`);
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Only set timeout if this is still the current request
      if (requestIdRef.current === currentRequestId) {
        timeoutId = setTimeout(() => {
          // Double check this is still the current request and controller hasn't been aborted
          if (requestIdRef.current === currentRequestId &&
              abortControllerRef.current === controller &&
              !controller.signal.aborted) {
            console.warn(`[${currentRequestId}] API call timed out after 35 seconds, aborting request...`);
            try {
              controller.abort();
            } catch (error) {
              // Silently ignore abort errors as they're expected
              console.debug(`[${currentRequestId}] Controller already aborted:`, error);
            }
          }
        }, 35000); // 35 seconds (longer than server timeout)
      }

      console.log(`[${currentRequestId}] Starting API call with timeout`);
      
      let response: Response;
      try {
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({ message, conversationHistory: [] }),
          signal: controller.signal
        });
      } catch (fetchError) {
        // Check if this is still the current request
        if (requestIdRef.current !== currentRequestId) {
          throw new Error('Request was superseded by a newer request');
        }
        
        // Re-throw fetch error for handling below
        throw fetchError;
      }

      // Check if this is still the current request
      if (requestIdRef.current !== currentRequestId) {
        console.log(`[${currentRequestId}] Request superseded, aborting`);
        throw new Error('Request was superseded by a newer request');
      }

      console.log(`[${currentRequestId}] API call completed, clearing timeout`);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Clear controller only if this is still the current request
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      if (!response.ok) {
        // Handle different HTTP status codes appropriately
        if (response.status === 429) {
          throw new Error('AI service temporarily busy - Please try again in a moment');
        } else if (response.status === 401) {
          throw new Error('Authentication failed - Please login again');
        } else if (response.status >= 500) {
          throw new Error('AI service temporarily unavailable - Please try again later');
        } else {
          throw new Error(`API call failed: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log(`[${currentRequestId}] API response data:`, data);
      
      // Double-check this is still the current request
      if (requestIdRef.current !== currentRequestId) {
        console.log(`[${currentRequestId}] Response received but request superseded`);
        throw new Error('Request was superseded by a newer request');
      }
      
      if (!data.success) {
        console.error(`[${currentRequestId}] API returned unsuccessful response:`, data);
        throw new Error(data.error || 'API returned error');
      }

      // Check if response is empty or undefined
      if (data.response === undefined) {
        console.error(`[${currentRequestId}] API returned undefined response:`, data);
        throw new Error('API returned undefined response');
      }
      
      if (!data.response || data.response.trim() === '') {
        console.error(`[${currentRequestId}] API returned empty response:`, data);
        throw new Error('API returned empty response');
      }

      // Log if fallback model was used
      if (data.usedFallback) {
        console.warn(`[${currentRequestId}] Fallback model ${data.model} was used due to primary model failure`);
      }

      // Cache the response with metadata
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

      console.log(`[${currentRequestId}] Request completed successfully in ${responseTime.toFixed(2)}ms`);
      
      // Final check to ensure we're not returning undefined
      if (!data.response || data.response.trim() === '') {
        throw new Error('API returned empty response');
      }
      
      return data.response;

    } catch (error) {
      console.error(`[${currentRequestId}] Chat API call failed (retry ${retryCount}/${maxRetries}):`, error);
      
      // Handle AbortController timeout and other abort errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.debug(`[${currentRequestId}] API call was aborted - ${requestIdRef.current === currentRequestId ? 'timeout/component unmount' : 'superseded by newer request'}`);
          
          // Only throw error if this is still the current request
          if (requestIdRef.current === currentRequestId) {
            // For abort errors, check if we should show to user or silently handle
            // Most abort errors are internal cleanup and shouldn't be shown to user
            console.debug(`[${currentRequestId}] AbortError handled silently`);
            throw new Error('Request was aborted');
          } else {
            // If this is an old request, just throw a generic error
            throw new Error('Request was superseded');
          }
        }
        
        // Handle superseded requests
        if (error.message === 'Request was superseded by a newer request') {
          console.log(`[${currentRequestId}] Request superseded, not retrying`);
          throw error;
        }
        
        // Handle network errors
        if (error.message.includes('fetch')) {
          console.error(`[${currentRequestId}] Network error occurred`);
          throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.');
        }
      }
      
      // Retry logic for non-abort errors (only if this is still the current request)
      if (retryCount < maxRetries && requestIdRef.current === currentRequestId) {
        // Don't retry on authentication errors
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          console.error(`[${currentRequestId}] Authentication error, not retrying`);
          throw error;
        }
        
        console.warn(`[${currentRequestId}] Retrying chat API call (${retryCount + 1}/${maxRetries})`);
        
        // Exponential backoff with different delays for different error types
        let delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
        
        // Longer delay for rate limit errors
        if (error instanceof Error && (error.message.includes('temporarily busy') || error.message.includes('429'))) {
          delay = Math.min(Math.pow(2, retryCount) * 2000, 20000); // 2x longer for rate limit
          console.log(`[${currentRequestId}] Rate limit detected, waiting ${delay}ms before retry...`);
        } else {
          console.log(`[${currentRequestId}] Waiting ${delay}ms before retry...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return optimizedChatCall(message, context, retryCount + 1);
      }

      console.error(`[${currentRequestId}] All retries exhausted or request superseded, throwing error:`, error);
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
      
      // Abort any ongoing API calls
      if (abortControllerRef.current) {
        console.log(`[${requestIdRef.current || 'unknown'}] Cleaning up: aborting ongoing API call`);
        try {
          abortControllerRef.current.abort();
        } catch (error) {
          console.error(`[${requestIdRef.current || 'unknown'}] Error during cleanup abort:`, error);
        }
        abortControllerRef.current = null;
      }
      
      // Clear request ID
      requestIdRef.current = null;
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