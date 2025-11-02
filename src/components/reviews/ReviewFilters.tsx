"use client";

import { useState } from "react";
import { MdArrowDropDown, MdSort } from "react-icons/md";

type SortOption = "newest" | "oldest" | "highest" | "lowest";

type ReviewFiltersProps = {
  onSortChange?: (sort: SortOption) => void;
  onFilterChange?: (filters: {
    rating?: number;
    withPhotos?: boolean;
    withVideos?: boolean;
  }) => void;
  activeSort?: SortOption;
  activeFilters?: {
    rating?: number;
    withPhotos?: boolean;
    withVideos?: boolean;
  };
  totalReviews: number;
  filteredCount?: number;
};

export default function ReviewFilters({
  onSortChange,
  onFilterChange,
  activeSort = "newest",
  activeFilters = {},
  totalReviews,
  filteredCount
}: ReviewFiltersProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Mới nhất" },
    { value: "oldest", label: "Cũ nhất" },
    { value: "highest", label: "Đánh giá cao nhất" },
    { value: "lowest", label: "Đánh giá thấp nhất" }
  ];

  const handleSortChange = (sort: SortOption) => {
    if (onSortChange) {
      onSortChange(sort);
    }
    setShowSortDropdown(false);
  };

  const handleFilterToggle = (type: "rating" | "withPhotos" | "withVideos", value?: number) => {
    if (onFilterChange) {
      if (type === "rating") {
        const newRating = activeFilters.rating === value ? undefined : value;
        onFilterChange({ ...activeFilters, rating: newRating });
      } else if (type === "withPhotos") {
        onFilterChange({ ...activeFilters, withPhotos: !activeFilters.withPhotos });
      } else if (type === "withVideos") {
        onFilterChange({ ...activeFilters, withVideos: !activeFilters.withVideos });
      }
    }
  };

  const hasActiveFilters = activeFilters.rating || activeFilters.withPhotos || activeFilters.withVideos;

  const handleClearFilters = () => {
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Sort & Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Sort Dropdown */}
          <div className="sort-dropdown relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all duration-200 text-sm font-medium text-gray-700"
            >
              <MdSort className="w-4 h-4" />
              <span>Sắp xếp: {sortOptions.find(opt => opt.value === activeSort)?.label}</span>
              <MdArrowDropDown className={`w-5 h-5 transition-transform duration-200 ${showSortDropdown ? "rotate-180" : ""}`} />
            </button>

            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 sort-dropdown-menu">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`
                        w-full text-left px-4 py-2 text-sm transition-colors duration-150
                        ${activeSort === option.value
                          ? "bg-gradient-to-r from-[#5A6794] to-[#8794C0] text-white font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Count */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5A6794]/10 text-[#5A6794] rounded-lg text-sm font-medium">
              <span>{filteredCount || totalReviews} kết quả</span>
              <button
                onClick={handleClearFilters}
                className="ml-2 text-[#5A6794] hover:text-[#4a5678] font-semibold underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Review Count */}
        <div className="text-sm text-gray-600">
          {hasActiveFilters ? (
            <span>Hiển thị {filteredCount || 0} / {totalReviews} đánh giá</span>
          ) : (
            <span>Tổng cộng {totalReviews} đánh giá</span>
          )}
        </div>
      </div>

      {/* Filter Checkboxes (Optional - Collapsible on mobile) */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Lọc theo:</span>
        
        {/* Rating Filters */}
        {[5, 4, 3, 2, 1].map((rating) => (
          <label
            key={rating}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-[#8794C0] transition-colors duration-200"
          >
            <input
              type="checkbox"
              checked={activeFilters.rating === rating}
              onChange={() => handleFilterToggle("rating", rating)}
              className="w-4 h-4 text-[#5A6794] border-gray-300 rounded focus:ring-[#8794C0] focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">
              {rating} ⭐
            </span>
          </label>
        ))}

        {/* Media Filters */}
        <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-[#8794C0] transition-colors duration-200">
          <input
            type="checkbox"
            checked={activeFilters.withPhotos || false}
            onChange={() => handleFilterToggle("withPhotos")}
            className="w-4 h-4 text-[#5A6794] border-gray-300 rounded focus:ring-[#8794C0] focus:ring-2"
          />
          <span className="text-sm font-medium text-gray-700">
            Có hình ảnh
          </span>
        </label>

        <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-[#8794C0] transition-colors duration-200">
          <input
            type="checkbox"
            checked={activeFilters.withVideos || false}
            onChange={() => handleFilterToggle("withVideos")}
            className="w-4 h-4 text-[#5A6794] border-gray-300 rounded focus:ring-[#8794C0] focus:ring-2"
          />
          <span className="text-sm font-medium text-gray-700">
            Có video
          </span>
        </label>
      </div>
    </div>
  );
}

