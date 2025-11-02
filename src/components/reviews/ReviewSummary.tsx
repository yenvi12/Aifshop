"use client";

import StarRating from "./StarRating";
import StarDistribution from "./StarDistribution";

type Review = {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  videos: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
};

type ReviewSummaryProps = {
  reviews: Review[];
  onFilterChange?: (filter: { rating?: number; withPhotos?: boolean }) => void;
  activeFilters?: { rating?: number; withPhotos?: boolean };
};

export default function ReviewSummary({
  reviews,
  onFilterChange,
  activeFilters = {}
}: ReviewSummaryProps) {
  if (reviews.length === 0) {
    return null;
  }

  // Calculate average rating
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const roundedAverage = Math.round(averageRating * 10) / 10;

  // Calculate star distribution
  const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((review) => {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  });

  // Count reviews with photos/videos
  const reviewsWithMedia = reviews.filter(
    (review) => review.images.length > 0 || review.videos.length > 0
  ).length;

  const handleQuickFilter = (rating?: number, withPhotos?: boolean) => {
    if (onFilterChange) {
      onFilterChange({ rating, withPhotos });
    }
  };

  const handleStarClick = (rating: number) => {
    if (onFilterChange) {
      const newRating = activeFilters?.rating === rating ? undefined : rating;
      onFilterChange({ ...activeFilters, rating: newRating });
    }
  };

  return (
    <div className="review-summary-card rounded-2xl p-6 md:p-8 mb-8 animate-fade-in-scale">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Rating Overview */}
        <div className="flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Đánh giá khách hàng
          </h3>
          
          {/* Large Rating Display */}
          <div className="flex flex-col items-center lg:items-start mb-6">
            <div className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
              {roundedAverage}
            </div>
            <StarRating rating={roundedAverage} size="lg" showRating={false} />
            <p className="text-sm text-gray-600 mt-2">
              Dựa trên {reviews.length} đánh giá
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickFilter(undefined, undefined)}
              className={`
                filter-button px-4 py-2 rounded-lg text-sm font-medium
                ${!activeFilters.rating && !activeFilters.withPhotos
                  ? "filter-button-active"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              Tất cả
            </button>
            <button
              onClick={() => handleQuickFilter(5)}
              className={`
                filter-button px-4 py-2 rounded-lg text-sm font-medium
                ${activeFilters.rating === 5
                  ? "filter-button-active"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              5 ⭐
            </button>
            <button
              onClick={() => handleQuickFilter(4)}
              className={`
                filter-button px-4 py-2 rounded-lg text-sm font-medium
                ${activeFilters.rating === 4
                  ? "filter-button-active"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              4 ⭐
            </button>
            {reviewsWithMedia > 0 && (
              <button
                onClick={() => handleQuickFilter(undefined, true)}
                className={`
                  filter-button px-4 py-2 rounded-lg text-sm font-medium
                  ${activeFilters.withPhotos
                    ? "filter-button-active"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                Có hình ảnh ({reviewsWithMedia})
              </button>
            )}
          </div>
        </div>

        {/* Right: Star Distribution */}
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Phân phối đánh giá
          </h4>
          <StarDistribution
            distribution={distribution}
            totalReviews={reviews.length}
            onStarClick={handleStarClick}
            activeFilter={activeFilters.rating || null}
          />
        </div>
      </div>
    </div>
  );
}

