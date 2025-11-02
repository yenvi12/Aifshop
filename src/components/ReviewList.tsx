"use client";

import { useState, useMemo } from "react";
import { MdStar } from "react-icons/md";
import ReviewSummary from "./reviews/ReviewSummary";
import ReviewFilters from "./reviews/ReviewFilters";
import ReviewCard from "./reviews/ReviewCard";

type SortOption = "newest" | "oldest" | "highest" | "lowest";

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
  verifiedPurchase?: boolean;
};

type Props = {
  reviews: Review[];
  currentUserId: string | null;
  onEditReview: (review: Review) => void;
  onDeleteReview: (reviewId: string) => void;
  editingReviewId?: string | null;
  deletingReviewId?: string | null;
};

export default function ReviewList({
  reviews,
  currentUserId,
  onEditReview,
  onDeleteReview,
  editingReviewId = null,
  deletingReviewId = null
}: Props) {
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<{
    rating?: number;
    withPhotos?: boolean;
    withVideos?: boolean;
  }>({});

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    // Filter by rating
    if (filters.rating) {
      result = result.filter((review) => review.rating === filters.rating);
    }

    // Filter by photos
    if (filters.withPhotos) {
      result = result.filter((review) => review.images.length > 0);
    }

    // Filter by videos
    if (filters.withVideos) {
      result = result.filter((review) => review.videos.length > 0);
    }

    return result;
  }, [reviews, filters]);

  // Sort reviews
  const sortedReviews = useMemo(() => {
    const sorted = [...filteredReviews];

    switch (sortOption) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      default:
        break;
    }

    return sorted;
  }, [filteredReviews, sortOption]);

  // Calculate verified purchase (all reviews are verified since they passed eligibility check)
  const reviewsWithVerified = sortedReviews.map((review) => ({
    ...review,
    verifiedPurchase: true // All reviews are verified since backend checks eligibility
  }));

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className="review-empty-state text-center py-16 px-4 rounded-2xl">
        <MdStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Chưa có đánh giá nào
        </h3>
        <p className="text-gray-500 mb-4">
          Hãy là người đầu tiên đánh giá sản phẩm này!
        </p>
      </div>
    );
  }

  // No results after filtering
  if (filteredReviews.length === 0) {
    return (
      <>
        <ReviewSummary
          reviews={reviews}
          onFilterChange={setFilters}
          activeFilters={filters}
        />
        <ReviewFilters
          onSortChange={setSortOption}
          onFilterChange={setFilters}
          activeSort={sortOption}
          activeFilters={filters}
          totalReviews={reviews.length}
          filteredCount={0}
        />
        <div className="review-empty-state text-center py-16 px-4 rounded-2xl">
          <MdStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Không tìm thấy đánh giá
          </h3>
          <p className="text-gray-500 mb-4">
            Không có đánh giá nào khớp với bộ lọc của bạn.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <ReviewSummary
        reviews={reviews}
        onFilterChange={setFilters}
        activeFilters={filters}
      />

      {/* Filters & Sort */}
      <ReviewFilters
        onSortChange={setSortOption}
        onFilterChange={setFilters}
        activeSort={sortOption}
        activeFilters={filters}
        totalReviews={reviews.length}
        filteredCount={filteredReviews.length}
      />

      {/* Reviews List */}
      <div className="space-y-4">
        {reviewsWithVerified.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            onEditReview={onEditReview}
            onDeleteReview={onDeleteReview}
            isEditing={editingReviewId === review.id}
            isDeleting={deletingReviewId === review.id}
          />
        ))}
      </div>
    </div>
  );
}
