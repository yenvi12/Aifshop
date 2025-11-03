"use client";

import { MdExpandMore, MdExpandLess } from "react-icons/md";
import type { ReadMoreButtonProps } from "../types";

export default function ReadMoreButton({
  isExpanded,
  onToggle,
  className = "",
}: ReadMoreButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        inline-flex items-center gap-2 mt-4 text-brand-primary 
        font-medium text-sm hover:text-brand-secondary
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:ring-offset-2
        rounded-lg px-3 py-1.5 hover:bg-brand-primary/5
        ${className}
      `}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Thu gọn" : "Đọc thêm"}
    >
      <span>{isExpanded ? "Thu gọn" : "Đọc thêm"}</span>
      {isExpanded ? (
        <MdExpandLess className="w-5 h-5 transition-transform duration-200" />
      ) : (
        <MdExpandMore className="w-5 h-5 transition-transform duration-200" />
      )}
    </button>
  );
}

