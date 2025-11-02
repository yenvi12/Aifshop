"use client";

import { useState, useEffect, useRef } from "react";
import { MdSearch, MdTrendingUp, MdHistory } from "react-icons/md";
import { useRouter } from "next/navigation";

interface SearchSuggestion {
  type: "product" | "category" | "history" | "trending";
  text: string;
  count?: number;
  category?: string;
}

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  viaPortal?: boolean;
}

export default function SearchSuggestions({ 
  query, 
  isOpen, 
  onSelect, 
  onClose,
  viaPortal = false
}: SearchSuggestionsProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const mockSuggestions: SearchSuggestion[] = [
      // Product suggestions
      { type: "product", text: `${query} necklace` },
      { type: "product", text: `${query} ring` },
      { type: "product", text: `${query} earrings` },
      { type: "product", text: `silver ${query}` },
      { type: "product", text: `gold ${query}` },
      
      // Category suggestions
      { type: "category", text: "Necklaces", category: "jewelry" },
      { type: "category", text: "Rings", category: "jewelry" },
      { type: "category", text: "Earrings", category: "jewelry" },
      { type: "category", text: "Bracelets", category: "jewelry" },
      
      // Trending searches
      { type: "trending", text: "minimalist jewelry", count: 1250 },
      { type: "trending", text: "sterling silver", count: 980 },
      { type: "trending", text: "pearl necklace", count: 756 },
      { type: "trending", text: "gold ring", count: 623 },
    ];

    // Filter suggestions based on query
    const filtered = mockSuggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    );

    // Add history suggestions at the top if they match
    const historyMatches = searchHistory
      .filter(historyItem => 
        historyItem.toLowerCase().includes(query.toLowerCase())
      )
      .map(item => ({ type: "history" as const, text: item }));

    setSuggestions([...historyMatches, ...filtered.slice(0, 8)]);
    setActiveIndex(-1);
  }, [query, isOpen, searchHistory]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0) {
            handleSelect(suggestions[activeIndex].text);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, activeIndex, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelect = (suggestion: string) => {
    // Add to search history
    const updatedHistory = [suggestion, ...searchHistory.filter(item => item !== suggestion)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    
    // Use setTimeout to ensure click event is processed before closing
    setTimeout(() => {
      onSelect(suggestion);
      onClose();
    }, 0);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "history":
        return <MdHistory className="w-4 h-4 text-brand-secondary" />;
      case "trending":
        return <MdTrendingUp className="w-4 h-4 text-red-500" />;
      default:
        return <MdSearch className="w-4 h-4 text-brand-primary" />;
    }
  };

  const getSuggestionStyle = (index: number) => {
    if (index === activeIndex) {
      return "bg-brand-light text-brand-dark";
    }
    return "hover:bg-brand-light/50 text-brand-dark";
  };

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className={`${viaPortal ? 'relative' : 'absolute top-full left-0 right-0 mt-2'} bg-white border border-brand-light rounded-xl shadow-lg z-[99999] max-h-96 overflow-y-auto`}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.text}-${index}`}
          onMouseDown={(e) => {
            // Prevent default to stop blur, but allow click to proceed
            e.preventDefault();
            handleSelect(suggestion.text);
          }}
          onClick={(e) => {
            // Fallback in case mousedown doesn't fire
            e.preventDefault();
            handleSelect(suggestion.text);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${getSuggestionStyle(index)}`}
        >
          {getSuggestionIcon(suggestion.type)}
          <div className="flex-1">
            <span className="text-sm">{suggestion.text}</span>
            {suggestion.category && (
              <span className="text-xs text-brand-secondary ml-2">
                in {suggestion.category}
              </span>
            )}
            {suggestion.count && (
              <span className="text-xs text-brand-secondary ml-2">
                {suggestion.count.toLocaleString()} results
              </span>
            )}
          </div>
        </button>
      ))}
      
      {searchHistory.length > 0 && (
        <div className="border-t border-brand-light">
          <div className="px-4 py-2">
            <p className="text-xs text-brand-secondary font-medium uppercase tracking-wide">
              Recent Searches
            </p>
          </div>
          {searchHistory.slice(0, 3).map((item, index) => (
            <button
              key={`history-${item}-${index}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              onClick={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${getSuggestionStyle(index + suggestions.length)}`}
            >
              <MdHistory className="w-4 h-4 text-brand-secondary" />
              <span className="text-sm text-brand-secondary">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}