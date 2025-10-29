"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { MdDiamond, MdClear, MdMoreHoriz, MdExpandMore } from "react-icons/md";
import { Suggestion } from "@/hooks/useChatAI";

interface QuickSuggestionsProps {
  suggestions: Suggestion[];
  showSuggestions: boolean;
  hasHistory: boolean;
  onClearHistory?: () => void;
}

const DISPLAY_COUNT = 2; // Number of suggestions to show in compact mode
const ROTATION_INTERVAL = 6000; // 6 seconds

export default function QuickSuggestions({
  suggestions,
  showSuggestions,
  hasHistory,
  onClearHistory
}: QuickSuggestionsProps) {
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 0 });
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showMoreButtonRef = useRef<HTMLButtonElement>(null);

  // Memoize the clear history handler
  const handleClearHistory = useCallback(() => {
    onClearHistory?.();
  }, [onClearHistory]);

  // Get current suggestions to display (2 items with rotation)
  const currentSuggestions = useMemo(() => {
    if (suggestions.length <= DISPLAY_COUNT) {
      return suggestions;
    }
    
    const start = currentRotationIndex;
    const firstTwo = suggestions.slice(start, start + DISPLAY_COUNT);
    
    // If we need more to fill 2 slots, wrap around
    if (firstTwo.length < DISPLAY_COUNT) {
      const remaining = suggestions.slice(0, DISPLAY_COUNT - firstTwo.length);
      return [...firstTwo, ...remaining];
    }
    
    return firstTwo;
  }, [suggestions, currentRotationIndex]);

  // Rotation logic
  useEffect(() => {
    // Only rotate if we have more than DISPLAY_COUNT suggestions
    if (suggestions.length <= DISPLAY_COUNT || isHovered || showPopover) {
      return;
    }

    rotationIntervalRef.current = setInterval(() => {
      setCurrentRotationIndex((prev) => (prev + DISPLAY_COUNT) % suggestions.length);
    }, ROTATION_INTERVAL);

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [suggestions.length, isHovered, showPopover]);

  // Get remaining suggestions (for popover) - Must be defined before calculatePopoverPosition
  const remainingSuggestions = useMemo(() => {
    if (suggestions.length <= DISPLAY_COUNT) return [];
    const displayedIds = new Set(currentSuggestions.map(s => s.id));
    return suggestions.filter(s => !displayedIds.has(s.id));
  }, [suggestions, currentSuggestions]);

  // Calculate popover position based on button position
  const calculatePopoverPosition = useCallback(() => {
    if (!showMoreButtonRef.current) return;
    
    const buttonRect = showMoreButtonRef.current.getBoundingClientRect();
    const spacing = 8; // Space between button and popover
    
    setPopoverPosition({
      top: buttonRect.top - spacing, // Position above button with spacing
      right: window.innerWidth - buttonRect.right // Align with right edge
    });
  }, []);

  // Handle hover for popover
  const handleShowMoreEnter = useCallback(() => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current);
    }
    calculatePopoverPosition();
    setIsHovered(true);
    setShowPopover(true);
  }, [calculatePopoverPosition]);

  const handleShowMoreLeave = useCallback(() => {
    popoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowPopover(false);
    }, 200); // Small delay to prevent flicker
  }, []);

  // Recalculate position on window resize
  useEffect(() => {
    if (!showPopover) return;

    const handleResize = () => {
      calculatePopoverPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [showPopover, calculatePopoverPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
      if (popoverTimeoutRef.current) {
        clearTimeout(popoverTimeoutRef.current);
      }
    };
  }, []);

  // Get suggestion icon
  const getSuggestionIcon = useCallback((suggestion: Suggestion) => {
    // Use provided icon if available
    if (suggestion.icon) return suggestion.icon;
    
    // Fallback to emoji based on text content
    const text = suggestion.text.toLowerCase();
    if (text.includes('nhẫn')) return '💍';
    if (text.includes('dây chuyền') || text.includes('necklace')) return '📿';
    if (text.includes('kim cương') || text.includes('diamond')) return '💎';
    if (text.includes('quà tặng') || text.includes('gift')) return '🎁';
    if (text.includes('bảo quản') || text.includes('care')) return '✨';
    if (text.includes('size') || text.includes('sizing')) return '📏';
    if (text.includes('chi tiết') || text.includes('detail')) return '💎';
    if (text.includes('so sánh') || text.includes('compare')) return '🔍';
    if (text.includes('phối đồ') || text.includes('styling')) return '👗';
    if (text.includes('sản phẩm') || text.includes('product')) return '🛍️';
    if (text.includes('đơn hàng') || text.includes('order')) return '📦';
    return '✨';
  }, []);

  // Get category-based styling
  const getCategoryStyle = useCallback((category?: string) => {
    switch (category) {
      case 'product':
        return 'bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-brand-primary/20 hover:from-brand-primary/20 hover:to-brand-secondary/20';
      case 'conversation':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100';
      default:
        return 'bg-white border-gray-200 hover:bg-gray-50';
    }
  }, []);

  // Early return AFTER all hooks - to fix React Hooks rules violation
  if (!showSuggestions || suggestions.length === 0) return null;

  return (
    <div 
      className="border-t border-brand-light/30 bg-gradient-to-b from-brand-light/10 via-white to-white p-2.5 sm:p-3 flex-shrink-0 quick-suggestions-container quick-suggestions-compact"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-brand-secondary">
          <MdDiamond className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
          <span>Gợi ý nhanh</span>
        </div>
        {hasHistory && onClearHistory && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all duration-200 btn-interaction"
            title="Xóa lịch sử trò chuyện"
          >
            <MdClear className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Xóa</span>
          </button>
        )}
      </div>
      
      {/* Compact display - only 2 suggestions + Show More button */}
      <div className="relative flex items-center gap-2 quick-suggestions-compact-grid">
        {/* Display 2 suggestions */}
        {currentSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.id}-${currentRotationIndex}`}
            onClick={suggestion.action}
            className={`
              flex-1 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2
              rounded-full border
              transition-all duration-300 ease-out
              text-xs sm:text-sm font-medium
              text-brand-dark
              hover:shadow-md hover:scale-[1.02]
              active:scale-[0.98]
              quick-suggestion-chip
              ${getCategoryStyle(suggestion.category)}
              quick-suggestion-enter
            `}
            style={{
              animationDelay: `${index * 30}ms`
            }}
          >
            <span className="text-sm sm:text-base flex-shrink-0">
              {getSuggestionIcon(suggestion)}
            </span>
            <span className="truncate flex-1 text-left">
              {suggestion.text}
            </span>
          </button>
        ))}
        
        {/* Show More button with popover */}
        {remainingSuggestions.length > 0 && (
          <div 
            className="relative"
            onMouseEnter={handleShowMoreEnter}
            onMouseLeave={handleShowMoreLeave}
          >
            <button
              ref={showMoreButtonRef}
              className="
                flex items-center justify-center
                w-9 h-9 sm:w-10 sm:h-10
                rounded-full border border-gray-300
                bg-white hover:bg-gray-50
                text-gray-600 hover:text-brand-primary
                transition-all duration-200
                hover:shadow-md hover:scale-105
                active:scale-95
                quick-suggestion-chip
              "
              title={`Xem thêm ${remainingSuggestions.length} gợi ý`}
            >
              <MdMoreHoriz className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Popover with all remaining suggestions - Fixed positioning to escape overflow */}
        {showPopover && remainingSuggestions.length > 0 && (
          <div 
            className="fixed z-[100] quick-suggestions-popover"
            style={{
              top: `${popoverPosition.top}px`,
              right: `${popoverPosition.right}px`,
              transform: 'translateY(calc(-100% - 8px))' // Position above button with spacing
            }}
            onMouseEnter={handleShowMoreEnter}
            onMouseLeave={handleShowMoreLeave}
          >
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[280px] max-w-[320px] max-h-[300px] overflow-y-auto quick-suggestions-popover-content">
              <div className="text-xs font-semibold text-gray-700 mb-2 px-1">
                Thêm gợi ý ({remainingSuggestions.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {remainingSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      suggestion.action();
                      setShowPopover(false);
                    }}
                    className={`
                      flex items-center gap-2 px-3 py-2
                      rounded-lg border
                      transition-all duration-200
                      text-xs sm:text-sm font-medium
                      text-brand-dark
                      hover:shadow-sm hover:scale-[1.02]
                      active:scale-[0.98]
                      quick-suggestion-chip
                      ${getCategoryStyle(suggestion.category)}
                    `}
                  >
                    <span className="text-base flex-shrink-0">
                      {getSuggestionIcon(suggestion)}
                    </span>
                    <span className="truncate flex-1 text-left">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}