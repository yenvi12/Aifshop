"use client";

import { useCallback, useMemo } from "react";
import { MdDiamond, MdClear } from "react-icons/md";

interface Suggestion {
  id: string;
  text: string;
  action: () => void;
}

interface QuickSuggestionsProps {
  suggestions: Suggestion[];
  showSuggestions: boolean;
  hasHistory: boolean;
  onClearHistory?: () => void;
}

export default function QuickSuggestions({
  suggestions,
  showSuggestions,
  hasHistory,
  onClearHistory
}: QuickSuggestionsProps) {
  if (!showSuggestions) return null;

  // Memoize the clear history handler
  const handleClearHistory = useCallback(() => {
    onClearHistory?.();
  }, [onClearHistory]);

  // Memoize suggestions to prevent unnecessary re-renders
  const displaySuggestions = useMemo(() => suggestions.slice(0, 4), [suggestions]);

  // Memoize emoji mapping function
  const getSuggestionEmoji = useCallback((text: string) => {
    if (text.includes('nhẫn')) return '💍';
    if (text.includes('dây chuyền')) return '📿';
    if (text.includes('kim cương')) return '💎';
    if (text.includes('quà tặng')) return '🎁';
    if (text.includes('bảo quản')) return '✨';
    return '💰';
  }, []);

  return (
    <div className="border-t border-brand-light bg-gradient-to-b from-brand-light/20 to-white p-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-brand-secondary">
          <MdDiamond className="w-3 h-3" />
          <span>Gợi ý nhanh:</span>
        </div>
        {hasHistory && onClearHistory && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-primary transition-colors btn-interaction"
            title="Xóa lịch sử trò chuyện"
          >
            <MdClear className="w-3 h-3" />
            <span>Xóa</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {displaySuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={suggestion.action}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:bg-brand-light/60 transition-all duration-200 text-xs text-brand-dark hover:shadow-sm btn-interaction"
          >
            <span className="text-sm">{getSuggestionEmoji(suggestion.text)}</span>
            <span className="truncate font-medium">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}