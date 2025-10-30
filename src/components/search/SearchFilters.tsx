"use client";

import { useState, useEffect } from "react";
import { MdFilterList, MdClose, MdRefresh, MdExpandMore, MdExpandLess } from "react-icons/md";
import PriceRangeSection from "./PriceRangeSection";

export interface SearchFilters {
  category: string[];
  priceRange: [number, number];
  rating: number;
  inStock: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const CATEGORIES = [
  "Necklaces", "Earrings", "Rings", "Bracelets",
  "Sterling Silver", "Platinum", "Diamond", "Pearl"
];

export default function SearchFilters({
  filters,
  onFiltersChange,
  isOpen,
  onClose,
  className = ""
}: SearchFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    rating: true,
    stock: true
  });

  // Categories state - load động từ API
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Fetch categories từ API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        const response = await fetch('/api/categories');
        const result = await response.json();
        
        if (result.success && result.data) {
          setCategories(result.data);
        } else {
          setCategoriesError('Failed to load categories');
          // Fallback to default categories nếu API fails
          setCategories(CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategoriesError('Network error');
        // Fallback to default categories nếu API fails
        setCategories(CATEGORIES);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...filters.category, category]
      : filters.category.filter(c => c !== category);
    
    onFiltersChange({ ...filters, category: updatedCategories });
  };

  const handlePriceChange = (min: number, max: number) => {
    onFiltersChange({ ...filters, priceRange: [min, max] });
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ ...filters, rating });
  };

  const resetFilters = () => {
    onFiltersChange({
      category: [],
      priceRange: [0, 1000000],
      rating: 0,
      inStock: false
    });
  };

  const FilterSection = ({ 
    title, 
    children, 
    sectionKey 
  }: { 
    title: string; 
    children: React.ReactNode; 
    sectionKey: keyof typeof expandedSections;
  }) => (
    <div className="border-b border-brand-light/50 last:border-b-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-brand-light/30 px-2 -mx-2 rounded-lg transition-colors"
      >
        <h4 className="text-sm font-semibold text-brand-primary uppercase tracking-wide">
          {title}
        </h4>
        {expandedSections[sectionKey] ? (
          <MdExpandLess className="w-4 h-4 text-brand-secondary" />
        ) : (
          <MdExpandMore className="w-4 h-4 text-brand-secondary" />
        )}
      </button>
      {expandedSections[sectionKey] && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  );

  const FilterContent = () => (
    <div className="space-y-2">
      {/* Categories */}
      <FilterSection title="Danh mục" sectionKey="category">
        <div className="flex flex-col gap-3 pt-2">
          {categoriesLoading ? (
            <div className="text-sm text-brand-secondary py-2">Loading categories...</div>
          ) : categoriesError ? (
            <div className="text-sm text-red-600 py-2">Error loading categories</div>
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <label
                key={category}
                className="flex items-center gap-3 text-sm cursor-pointer hover:bg-brand-light/40 p-2 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.category.includes(category)}
                  onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  className="accent-brand-primary w-4 h-4 rounded border border-brand-light"
                />
                <span className="text-brand-dark">{category}</span>
              </label>
            ))
          ) : (
            <div className="text-sm text-brand-secondary py-2">No categories available</div>
          )}
        </div>
      </FilterSection>

      {/* Price Range - New Enhanced UI */}
      <FilterSection title="Khoảng giá" sectionKey="price">
        <PriceRangeSection
          priceRange={filters.priceRange}
          onPriceChange={handlePriceChange}
          onReset={resetFilters}
          className="mt-2"
        />
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Đánh giá" sectionKey="rating">
        <div className="flex flex-col gap-3 pt-2">
          {[4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex items-center gap-3 text-sm cursor-pointer hover:bg-brand-light/40 p-2 rounded-lg transition-colors"
            >
              <input
                type="radio"
                name="rating"
                checked={filters.rating === rating}
                onChange={() => handleRatingChange(rating)}
                className="accent-brand-primary"
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${i < rating ? "text-amber-400" : "text-brand-light"}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-xs text-brand-secondary ml-1">& up</span>
              </div>
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-brand-light/40 p-2 rounded-lg transition-colors">
            <input
              type="radio"
              name="rating"
              checked={filters.rating === 0}
              onChange={() => handleRatingChange(0)}
              className="accent-brand-primary"
            />
            <span className="text-brand-dark">Tất cả đánh giá</span>
          </label>
        </div>
      </FilterSection>

      {/* Stock Status */}
      <FilterSection title="Tình trạng" sectionKey="stock">
        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-brand-light/40 p-2 rounded-lg transition-colors pt-2">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onFiltersChange({ ...filters, inStock: e.target.checked })}
            className="accent-brand-primary w-4 h-4 rounded border border-brand-light"
          />
          <span className="text-brand-dark">Chỉ hiển thị sản phẩm còn hàng</span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block bg-white border border-brand-light/50 rounded-2xl p-6 h-fit sticky top-24 z-10 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
            <MdFilterList className="text-brand-primary" />
            Bộ lọc
          </h2>
          <button
            onClick={resetFilters}
            className="text-xs text-brand-primary hover:text-brand-dark transition-colors font-medium"
          >
            Xóa tất cả
          </button>
        </div>
        <FilterContent />
      </aside>

      {/* Mobile Filter Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`md:hidden fixed inset-0 z-[70] ${isOpen ? "" : "pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={`
            absolute inset-y-0 left-0 w-[90%] max-w-[400px]
            bg-white border-r border-brand-light shadow-xl
            transition-transform duration-300
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            rounded-r-2xl flex flex-col
          `}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light/50">
            <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
              <MdFilterList className="text-brand-primary" />
              Bộ lọc
            </h3>
            <button
              aria-label="Đóng bộ lọc"
              className="p-2 rounded-lg hover:bg-brand-light/60 text-brand-primary transition-colors"
              onClick={onClose}
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="flex-1 px-6 pt-6 pb-6 overflow-y-auto">
            <FilterContent />
          </div>
        </div>
      </div>
    </>
  );
}