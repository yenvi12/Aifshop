"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReadMoreButton from "./shared/ReadMoreButton";

interface DescriptionOverviewProps {
  overview?: string; // Tổng quan sản phẩm (short description)
  maxLength?: number;
  className?: string;
}

export default function DescriptionOverview({
  overview,
  maxLength = 200,
  className = "",
}: DescriptionOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { truncatedText, shouldShowButton } = useMemo(() => {
    if (!overview) {
      return { truncatedText: "", shouldShowButton: false };
    }

    if (overview.length <= maxLength) {
      return { truncatedText: overview, shouldShowButton: false };
    }

    const truncated = overview.slice(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    const finalTruncated =
      lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) : truncated;

    return {
      truncatedText: finalTruncated + "...",
      shouldShowButton: true,
    };
  }, [overview, maxLength]);

  if (!overview) {
    return null; // Không hiển thị section nếu không có overview
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-4">
        Tổng quan sản phẩm
      </h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : "truncated"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <p
            className={`
              text-base md:text-lg text-gray-700 leading-relaxed
              whitespace-pre-line
            `}
          >
            {isExpanded ? overview : truncatedText}
          </p>
        </motion.div>
      </AnimatePresence>

      {shouldShowButton && (
        <ReadMoreButton
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        />
      )}
    </section>
  );
}

