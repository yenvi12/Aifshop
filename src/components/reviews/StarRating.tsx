"use client";

import { MdStar } from "react-icons/md";
import { useState } from "react";

type StarRatingProps = {
  rating: number;
  size?: "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  showRating?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
};

export default function StarRating({
  rating,
  size = "md",
  interactive = false,
  showRating = false,
  onRatingChange,
  className = ""
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6"
  };

  const displayRating = hoveredRating || rating;
  const roundedRating = Math.round(displayRating * 10) / 10;

  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= Math.round(displayRating);
          const isHalf = !isFilled && starValue - 0.5 <= displayRating;

          return (
            <button
              key={i}
              type={interactive ? "button" : undefined}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => interactive && setHoveredRating(starValue)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
              disabled={!interactive}
              className={`
                ${sizeClasses[size]} 
                transition-all duration-200
                ${interactive ? "cursor-pointer star-hover" : "cursor-default"}
                ${isFilled 
                  ? "text-yellow-400 fill-current star-filled" 
                  : isHalf
                  ? "text-yellow-400 fill-current opacity-50"
                  : "text-gray-300"
                }
              `}
              aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            >
              <MdStar className="w-full h-full" />
            </button>
          );
        })}
      </div>
      {showRating && (
        <span className="text-sm font-semibold text-gray-700 ml-1">
          {roundedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

