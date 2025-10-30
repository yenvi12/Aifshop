"use client";

import { useState, useEffect } from "react";
import { MdFilterList, MdClose, MdRefresh, MdExpandMore, MdExpandLess } from "react-icons/md";

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

// VNĐ Currency formatting helper functions
const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const parseVND = (formattedValue: string): number => {
  // Remove all non-digit characters except numbers
  const numericString = formattedValue.replace(/[^\d]/g, '');
  return numericString ? parseInt(numericString, 10) : 0;
};

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

  // Separate state for formatted input values to avoid infinite loops
  const [priceInputs, setPriceInputs] = useState({
    min: "",
    max: ""
  });

  // Update formatted inputs when price range changes
  useEffect(() => {
    setPriceInputs({
      min: formatVND(filters.priceRange[0]),
      max: formatVND(filters.priceRange[1])
    });
  }, [filters.priceRange]);

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

  // Brands filter functions removed

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
    <div className="border-b border-brand-light last:border-b-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-brand-light/50 px-1 -mx-1 rounded transition-colors"
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
        <div className="pb-3">
          {children}
        </div>
      )}
    </div>
  );

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Categories */}
      <FilterSection title="Categories" sectionKey="category">
        <div className="flex flex-col gap-2">
          {categoriesLoading ? (
            <div className="text-sm text-brand-secondary py-2">Loading categories...</div>
          ) : categoriesError ? (
            <div className="text-sm text-red-600 py-2">Error loading categories</div>
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-brand-light/30 p-1 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.category.includes(category)}
                  onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  className="accent-brand-primary w-4 h-4 rounded-full border border-brand-light"
                />
                <span className="text-brand-dark">{category}</span>
              </label>
            ))
          ) : (
            <div className="text-sm text-brand-secondary py-2">No categories available</div>
          )}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range" sectionKey="price">
        <div className="space-y-4">
          {/* Input Fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-brand-secondary mb-1">Tối thiểu</label>
                <input
                  type="text"
                  placeholder="0"
                  value={priceInputs.min}
                  onChange={(e) => {
                    const numericValue = parseVND(e.target.value);
                    const clampedValue = Math.max(0, Math.min(numericValue, filters.priceRange[1]));
                    setPriceInputs(prev => ({ ...prev, min: e.target.value }));
                    handlePriceChange(clampedValue, filters.priceRange[1]);
                  }}
                  className="w-full px-3 py-2 border border-brand-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <span className="text-brand-secondary text-sm mt-6">—</span>
              <div className="flex-1">
                <label className="block text-xs text-brand-secondary mb-1">Tối đa</label>
                <input
                  type="text"
                  placeholder="1,000,000"
                  value={priceInputs.max}
                  onChange={(e) => {
                    const numericValue = parseVND(e.target.value);
                    const clampedValue = Math.max(filters.priceRange[0], Math.min(numericValue, 1000000));
                    setPriceInputs(prev => ({ ...prev, max: e.target.value }));
                    handlePriceChange(filters.priceRange[0], clampedValue);
                  }}
                  className="w-full px-3 py-2 border border-brand-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Range Slider */}
          <div className="px-1">
            <input
              type="range"
              min="0"
              max="1000000"
              step="50000"
              value={filters.priceRange[1]}
              onChange={(e) => handlePriceChange(filters.priceRange[0], Number(e.target.value))}
              className="w-full h-2 bg-brand-light rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-brand-secondary mt-2">
              <span>0₫</span>
              <span className="font-medium">{formatVND(filters.priceRange[0])}₫</span>
              <span className="font-medium">{formatVND(filters.priceRange[1])}₫</span>
              <span>1M₫</span>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Rating" sectionKey="rating">
        <div className="flex flex-col gap-2">
          {[4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-brand-light/30 p-1 rounded transition-colors"
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
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-brand-light/30 p-1 rounded transition-colors">
            <input
              type="radio"
              name="rating"
              checked={filters.rating === 0}
              onChange={() => handleRatingChange(0)}
              className="accent-brand-primary"
            />
            <span className="text-brand-dark">All ratings</span>
          </label>
        </div>
      </FilterSection>

      {/* Brands section removed as requested */}

      {/* Stock Status */}
      <FilterSection title="Stock Status" sectionKey="stock">
        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-brand-light/30 p-1 rounded transition-colors">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onFiltersChange({ ...filters, inStock: e.target.checked })}
            className="accent-brand-primary w-4 h-4 rounded-full border border-brand-light"
          />
          <span className="text-brand-dark">In stock only</span>
        </label>
      </FilterSection>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={resetFilters}
          className="flex-1 justify-center text-xs py-2 rounded-lg bg-brand-accent text-white font-semibold hover:opacity-90 flex items-center gap-1 transition-opacity"
        >
          <MdRefresh className="size-4" />
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 justify-center text-xs py-2 rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary/5 flex items-center gap-1 transition-colors"
        >
          <MdFilterList className="size-4" />
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block bg-white border border-brand-light rounded-2xl p-5 h-fit sticky top-20 z-10 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
            <MdFilterList className="text-brand-primary" />
            Filters
          </h2>
          <button
            onClick={resetFilters}
            className="text-xs text-brand-primary hover:text-brand-dark transition-colors"
          >
            Clear all
          </button>
        </div>
        <FilterContent />
      </aside>

      {/* Mobile Filter Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`md:hidden fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={`
            absolute inset-y-0 left-0 w-[86%] max-w-[360px]
            bg-white border-r border-brand-light shadow-lg
            transition-transform duration-300
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            rounded-r-2xl flex flex-col
          `}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-brand-light">
            <h3 className="text-base font-semibold text-brand-dark flex items-center gap-2">
              <MdFilterList className="text-brand-primary" />
              Filters
            </h3>
            <button
              aria-label="Close filters"
              className="p-2 rounded-lg hover:bg-brand-light/60 text-brand-primary transition-colors"
              onClick={onClose}
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="flex-1 px-4 pt-4 pb-6 overflow-y-auto">
            <FilterContent />
          </div>
        </div>
      </div>
    </>
  );
}