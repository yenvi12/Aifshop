"use client";

import { motion } from "framer-motion";
import type { FeatureCardProps } from "../types";

export default function DescriptionCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={`
        bg-white border border-gray-200 rounded-xl p-6
        transition-all duration-300
        hover:border-brand-primary/30 hover:shadow-lg
        hover:shadow-brand-primary/5
      `}
    >
      {/* Icon */}
      {icon && (
        <div className="mb-4 w-12 h-12 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
          {icon}
        </div>
      )}

      {/* Title */}
      <h4 className="text-lg font-semibold text-brand-dark mb-2">{title}</h4>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 leading-relaxed line-height-1.6">
          {description}
        </p>
      )}
    </motion.div>
  );
}

