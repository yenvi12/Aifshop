"use client";

import { useState } from "react";
import Image from "next/image";
import { MdMoreVert, MdEdit, MdDelete, MdThumbUp, MdVerified } from "react-icons/md";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale/vi";
import StarRating from "./StarRating";
import MediaGallery from "./MediaGallery";

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

type ReviewCardProps = {
  review: Review;
  currentUserId: string | null;
  onEditReview?: (review: Review) => void;
  onDeleteReview?: (reviewId: string) => void;
  onHelpful?: (reviewId: string) => void;
  isEditing?: boolean;
  isDeleting?: boolean;
  isHelpful?: boolean;
  helpfulCount?: number;
};

export default function ReviewCard({
  review,
  currentUserId,
  onEditReview,
  onDeleteReview,
  onHelpful,
  isEditing = false,
  isDeleting = false,
  isHelpful = false,
  helpfulCount = 0
}: ReviewCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isOwner = review.user.id === currentUserId;
  const shouldShowExpand = review.comment.length > 200;

  // Format date with proper handling
  const formattedDate = (() => {
    try {
      const date = new Date(review.createdAt);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return review.createdAt; // Fallback to original string if invalid
      }
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: vi
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return review.createdAt; // Fallback to original string
    }
  })();

  const displayComment = expanded || !shouldShowExpand
    ? review.comment
    : review.comment.substring(0, 200) + "...";

  const handleHelpful = () => {
    if (onHelpful) {
      onHelpful(review.id);
    }
  };

  return (
    <div className="review-card review-card-enter rounded-2xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar */}
          <div className="avatar-gradient flex-shrink-0">
            <div className="avatar-gradient-inner">
              {review.user.avatar ? (
                <Image
                  src={review.user.avatar}
                  alt={review.user.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5A6794] to-[#8794C0] flex items-center justify-center text-white font-semibold text-lg">
                  {review.user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* User Info & Rating */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 text-base">
                {review.user.name}
              </h4>
              {(review.verifiedPurchase !== false) && (
                <span className="verified-badge flex items-center gap-1">
                  <MdVerified className="w-3 h-3" />
                  Đã mua hàng
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-sm text-gray-500">
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown Menu for Edit/Delete */}
        {isOwner && (
          <div className="relative dropdown-container flex-shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              aria-expanded={showDropdown}
              aria-haspopup="menu"
              aria-label={`Tùy chọn cho đánh giá của ${review.user.name}`}
            >
              <MdMoreVert className="w-5 h-5" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1 sort-dropdown-menu">
                {onEditReview && (
                  <button
                    disabled={isEditing}
                    onClick={() => {
                      setShowDropdown(false);
                      onEditReview(review);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-150"
                  >
                    <MdEdit className="w-4 h-4" />
                    {isEditing ? "Đang tải..." : "Chỉnh sửa"}
                  </button>
                )}
                {onDeleteReview && (
                  <button
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDropdown(false);
                      onDeleteReview(review.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-150"
                  >
                    <MdDelete className="w-4 h-4" />
                    {isDeleting ? "Đang xóa..." : "Xóa"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comment */}
      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed text-base">
          {displayComment}
        </p>
        {shouldShowExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm font-medium text-[#5A6794] hover:text-[#4a5678] transition-colors duration-200"
          >
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        )}
      </div>

      {/* Media Gallery */}
      {(review.images.length > 0 || review.videos.length > 0) && (
        <div className="mb-4">
          <MediaGallery
            images={review.images}
            videos={review.videos}
            maxVisible={4}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        {onHelpful && (
          <button
            onClick={handleHelpful}
            className={`
              helpful-button flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isHelpful
                ? "helpful-button-active"
                : "text-gray-600 hover:text-[#5A6794]"
              }
            `}
          >
            <MdThumbUp className={`w-4 h-4 ${isHelpful ? "fill-current" : ""}`} />
            <span>Hữu ích</span>
            {helpfulCount > 0 && (
              <span className="text-xs text-gray-500">
                ({helpfulCount})
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

