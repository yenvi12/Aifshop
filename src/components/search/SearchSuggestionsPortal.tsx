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
      const rect = sourceRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setPosition({
        top: rect.bottom + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width
      });
    }
  }, [isOpen, sourceRef]);

  if (!mounted || !isOpen) {
    return null;
  }

  const suggestionsElement = (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      <SearchSuggestions
        query={query}
        isOpen={isOpen}
        onSelect={onSelect}
        onClose={onClose}
      />
    </div>
  );

  return createPortal(suggestionsElement, document.body);
}