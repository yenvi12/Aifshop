"use client";

import { MdStar } from "react-icons/md";

type StarDistributionProps = {
  distribution: { [key: number]: number }; // {5: 75, 4: 15, 3: 5, 2: 3, 1: 2}
  totalReviews: number;
  onStarClick?: (rating: number) => void;
  activeFilter?: number | null;
};

export default function StarDistribution({
  distribution,
  totalReviews,
  onStarClick,
  activeFilter
}: StarDistributionProps) {
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const percentage = getPercentage(count);
        const isActive = activeFilter === star;

        return (
          <button
            key={star}
            onClick={() => onStarClick && onStarClick(star)}
            className={`
              w-full flex items-center gap-3 group
              ${onStarClick ? "cursor-pointer" : "cursor-default"}
              transition-all duration-200
            `}
          >
            {/* Star Label */}
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <span className="text-sm font-medium text-gray-700">{star}</span>
              <MdStar className="w-4 h-4 text-yellow-400 fill-current" />
            </div>

            {/* Progress Bar */}
            <div className="flex-1 relative h-2.5 rounded-full star-distribution-bar overflow-hidden">
              <div
                className={`h-full rounded-full star-distribution-fill transition-all duration-700 ${
                  isActive ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : ""
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Count */}
            <span className={`
              text-sm font-medium min-w-[60px] text-right
              ${isActive ? "text-yellow-600" : "text-gray-600"}
              transition-colors duration-200
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

