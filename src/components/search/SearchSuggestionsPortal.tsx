"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SearchSuggestions from "./SearchSuggestions";

interface SearchSuggestionsPortalProps {
  query: string;
  isOpen: boolean;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  sourceRef?: React.RefObject<HTMLElement | null>;
}

export default function SearchSuggestionsPortal({
  query,
  isOpen,
  onSelect,
  onClose,
  sourceRef
}: SearchSuggestionsPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && sourceRef?.current) {
      const updatePosition = () => {
        if (!sourceRef?.current) return;
        
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (!sourceRef?.current) return;
          const rect = sourceRef.current.getBoundingClientRect();
          // Use viewport coordinates directly since we use position: fixed
          // Add 8px margin (mt-2 equivalent) for spacing between input and suggestions
          setPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
          });
        });
      };

      // Initial position update
      updatePosition();

      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      // Reset position when closed
      setPosition({ top: 0, left: 0, width: 0 });
    }
  }, [isOpen, sourceRef, query]);

  if (!mounted || !isOpen) {
    return null;
  }

  const suggestionsElement = (
    <div
      data-search-suggestions-portal
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 99999,
        pointerEvents: 'auto',
        maxWidth: '100vw'
      }}
    >
      <SearchSuggestions
        query={query}
        isOpen={isOpen}
        onSelect={onSelect}
        onClose={onClose}
        viaPortal={true}
      />
    </div>
  );

  return createPortal(suggestionsElement, document.body);
}