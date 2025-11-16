"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MdSearch, MdClose } from "react-icons/md";
import SearchSuggestionsPortal from "./search/SearchSuggestionsPortal";
import SearchSuggestions from "./search/SearchSuggestions";

interface SearchBarProps {
  variant?: "navbar" | "hero";
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  showSuggestions?: boolean;
  enableHistory?: boolean;
}

export default function SearchBar({
  variant = "navbar",
  onSearch,
  placeholder,
  className = "",
  initialValue = "",
  showSuggestions = true,
  enableHistory = true,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
    setShowClearButton(initialValue.length > 0);
  }, [initialValue]);

  // Enhanced search function with history
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query.trim();
    if (!finalQuery) return;

    // Add to search history if enabled
    if (enableHistory) {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updatedHistory = [finalQuery, ...history.filter((item: string) => item !== finalQuery)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    }

    // Execute search
    if (onSearch) {
      onSearch(finalQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }
    
    setIsSuggestionsOpen(false);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        handleSearch();
        break;
      case "Escape":
        setIsSuggestionsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowClearButton(value.length > 0);
    
    // Show suggestions when there's input and showSuggestions is enabled
    if (showSuggestions && value.length > 0) {
      setIsSuggestionsOpen(true);
    } else {
      setIsSuggestionsOpen(false);
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

  const handleIconClick = () => {
    handleSearch();
  };

  // Enhanced Hero variant styles
  const heroStyles =
    variant === "hero"
      ? "w-full max-w-2xl px-5 py-3 text-sm md:text-base border border-brand-light/60 focus-within:border-brand-dark/30 focus-within:shadow-md focus-within:shadow-brand-dark/8 bg-white hover:border-brand-dark/30 transition-all duration-200"
      : "";

  // Enhanced Navbar variant styles
  const navbarStyles =
    variant === "navbar"
      ? "w-32 sm:w-40 md:w-52 lg:w-64 px-2 sm:px-3 py-1.5 text-sm border border-brand-secondary/40 focus-within:ring-2 focus-within:ring-brand-primary/40 focus-within:border-brand-primary/60 bg-white"
      : "";

  // Determine dimensions based on variant
  const iconSize = variant === "hero" ? "w-5 h-5" : "w-4 h-4";
  const iconPosition = variant === "hero" ? "right-5" : "right-3";

  // Determine padding based on clear button
  const inputPaddingClass = showClearButton 
    ? (variant === "hero" ? "pr-20" : "pr-16")
    : (variant === "hero" ? "pr-12" : "pr-9");

  // Placeholder text
  const defaultPlaceholder = variant === "hero" 
    ? "Tìm kiếm sản phẩm, thương hiệu..."
    : "Tìm kiếm trên trang";

  // Quick filter chips for hero variant when no query
  const quickFilterChips = variant === "hero" && !query ? (
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
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`relative rounded-lg transition-all duration-200 ${heroStyles} ${navbarStyles} ${variant === "hero" ? "hero-search-container" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setIsSuggestionsOpen(showSuggestions && query.length > 0);
            // Remove browser default outline completely
            const target = inputRef.current;
            if (target) {
              target.style.outline = 'none';
              target.style.boxShadow = 'none';
            }
          }}
          onBlur={(e) => {
            setIsFocused(false);
            // Check if the blur is caused by clicking on suggestions
            const relatedTarget = e.relatedTarget as Node;
            if (relatedTarget) {
              const suggestionsElement = (relatedTarget as Element)?.closest?.('[data-search-suggestions-portal]');
              if (suggestionsElement) {
                // Don't close if blurring to focus on suggestions
                return;
              }
            }
            // Delay closing suggestions to allow for clicks
            setTimeout(() => {
              // Double check suggestions are still supposed to be open
              if (!document.querySelector('[data-search-suggestions-portal]:hover')) {
                setIsSuggestionsOpen(false);
              }
            }, 200);
          }}
          placeholder={placeholder || defaultPlaceholder}
          className={`w-full outline-none !outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 bg-transparent text-brand-dark placeholder-brand-secondary/50 ${inputPaddingClass}`}
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        
        {/* Search Icon */}
        <button
          onClick={handleIconClick}
          className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 text-brand-secondary hover:text-brand-dark transition-colors duration-200 focus:outline-none rounded p-1 ${
            variant === "hero" ? "hover:scale-105" : ""
          }`}
          aria-label="Search"
        >
          <MdSearch className={iconSize} />
        </button>

        {/* Clear Button */}
        {showClearButton && (
          <button
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 text-brand-secondary hover:text-brand-dark transition-colors p-1 rounded-md hover:bg-brand-light/50 ${
              variant === "hero" ? "right-16" : "right-12"
            }`}
            aria-label="Clear search"
          >
            <MdClose className={variant === "hero" ? "w-4 h-4" : "w-3 h-3"} />
          </button>
        )}
      </div>

      {/* Search Suggestions - Conditional rendering */}
      {showSuggestions && (
        <SearchSuggestionsPortal
          query={query}
          isOpen={isSuggestionsOpen}
          onSelect={handleSuggestionSelect}
          onClose={() => setIsSuggestionsOpen(false)}
          sourceRef={inputRef}
        />
      )}

      {/* Quick Filter Chips */}
      {quickFilterChips}
    </div>
  );
}
