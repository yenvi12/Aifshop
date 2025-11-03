"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdExpandMore } from "react-icons/md";
import type { DescriptionAccordionProps } from "../types";

export default function DescriptionAccordion({
  title,
  icon,
  children,
  defaultOpen = false,
  className = "",
}: DescriptionAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-xl
        overflow-hidden transition-all duration-300
        hover:border-brand-primary/30
        ${className}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-6 py-4 flex items-center justify-between
          cursor-pointer transition-colors duration-200
          hover:bg-brand-soft focus:outline-none
          focus:ring-2 focus:ring-brand-primary/30 focus:ring-offset-2
        `}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Đóng" : "Mở"} ${title}`}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-brand-primary">{icon}</div>}
          <h3 className="text-base font-semibold text-brand-dark text-left">
            {title}
          </h3>
        </div>
        <MdExpandMore
          className={`
            w-5 h-5 text-brand-primary transition-transform duration-300
            ${isOpen ? "transform rotate-180" : ""}
          `}
        />
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 py-6 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

