"use client";

import { useState, useRef, useEffect } from "react";
import { MdSearch, MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";
import SearchSuggestions from "./SearchSuggestions";
import SearchSuggestionsPortal from "./SearchSuggestionsPortal";

interface EnhancedSearchBarProps {
  onSearch?: (query: string) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  usePortal?: boolean;
}

export default function EnhancedSearchBar({
  onSearch,
  initialValue = "",
  placeholder = "Tìm kiếm sản phẩm...",
  className = "",
  showSuggestions = true,
  usePortal = false
}: EnhancedSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
    setShowClearButton(initialValue.length > 0);
  }, [initialValue]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowClearButton(value.length > 0);
    setIsSuggestionsOpen(showSuggestions && value.length > 0);
  };

  // Handle search
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query.trim();
    if (!finalQuery) return;

    // Add to search history
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const updatedHistory = [finalQuery, ...history.filter((item: string) => item !== finalQuery)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    // Execute search
    if (onSearch) {
      onSearch(finalQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }
    
    setIsSuggestionsOpen(false);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSearch();
        break;
      case 'Escape':
        setIsSuggestionsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clear
  const handleClear = () => {
    setQuery("");
    setShowClearButton(false);
    setIsSuggestionsOpen(false);
    inputRef.current?.focus();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsSuggestionsOpen(showSuggestions && query.length > 0)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 border border-brand-light rounded-xl 
                     text-brand-dark placeholder-brand-secondary/70 
                     focus:outline-none focus:ring-2 focus:ring-brand-primary/30 
                     focus:border-brand-primary transition-all duration-200
                     bg-white hover:border-brand-primary/60"
        />
        
        {/* Search Icon */}
        <button
          onClick={() => handleSearch()}
          className="absolute right-3 top-1/2 -translate-y-1/2 
                     text-brand-secondary hover:text-brand-primary 
                     transition-colors p-1 rounded-md hover:bg-brand-light/50"
          aria-label="Search"
        >
          <MdSearch className="w-5 h-5" />
        </button>

        {/* Clear Button */}
        {showClearButton && (
          <button
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 
                       text-brand-secondary hover:text-brand-dark 
                       transition-colors p-1 rounded-md hover:bg-brand-light/50"
            aria-label="Clear search"
          >
            <MdClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && (
        usePortal ? (
          <SearchSuggestionsPortal
            query={query}
            isOpen={isSuggestionsOpen}
            onSelect={handleSuggestionSelect}
            onClose={() => setIsSuggestionsOpen(false)}
            sourceRef={inputRef}
          />
        ) : (
          <SearchSuggestions
            query={query}
            isOpen={isSuggestionsOpen}
            onSelect={handleSuggestionSelect}
            onClose={() => setIsSuggestionsOpen(false)}
          />
        )
      )}

      {/* Quick Filter Chips (when no query) */}
      {!query && (
        <div className="mt-3 flex flex-wrap gap-2">
          {["Necklaces", "Rings", "Earrings", "Silver", "Gold"].map((chip) => (
            <button
              key={chip}
              onClick={() => handleSearch(chip)}
              className="px-3 py-1.5 text-sm bg-brand-light/60 text-brand-dark 
                         rounded-full hover:bg-brand-light transition-colors
                         border border-brand-light hover:border-brand-primary"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}