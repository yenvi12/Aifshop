"use client";

import { MdSearch, MdTrendingUp, MdLightbulb } from "react-icons/md";
import { useRouter } from "next/navigation";

interface EnhancedEmptyStateProps {
  query?: string;
  hasSearched: boolean;
  onNewSearch: () => void;
  className?: string;
}

const TRENDING_SEARCHES = [
  "minimalist necklace",
  "silver earrings", 
  "pearl ring",
  "gold bracelet",
  "diamond pendant"
];

const SUGGESTIONS = [
  "Try different keywords",
  "Check spelling",
  "Use more general terms",
  "Browse our categories",
  "Contact support"
];

export default function EnhancedEmptyState({ 
  query, 
  hasSearched, 
  onNewSearch, 
  className = "" 
}: EnhancedEmptyStateProps) {
  const router = useRouter();

  const handleSuggestionClick = (suggestion: string) => {
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  const handleTrendingClick = (trend: string) => {
    router.push(`/search?q=${encodeURIComponent(trend)}`);
  };

  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Main Icon */}
        <div className="mb-6">
          {hasSearched ? (
            <div className="w-20 h-20 bg-brand-light/50 rounded-full flex items-center justify-center mx-auto">
              <MdSearch className="w-10 h-10 text-brand-secondary" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 rounded-full flex items-center justify-center mx-auto">
              <MdLightbulb className="w-10 h-10 text-brand-primary" />
            </div>
          )}
        </div>

        {/* Main Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-brand-dark mb-2">
            {hasSearched ? "Không tìm thấy sản phẩm" : "Bắt đầu tìm kiếm"}
          </h2>
          {hasSearched ? (
            <p className="text-brand-secondary mb-4">
              Không có sản phẩm nào khớp với từ khóa "{query}"
            </p>
          ) : (
            <p className="text-brand-secondary mb-4">
              Nhập từ khóa vào ô tìm kiếm để khám phá hàng ngàn sản phẩm
            </p>
          )}

          {/* Search Tips */}
          <div className="bg-brand-light/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-2 flex items-center gap-2">
              <MdLightbulb className="w-4 h-4 text-brand-primary" />
              Gợi ý tìm kiếm
            </h3>
            <ul className="text-sm text-brand-secondary space-y-1">
              <li>• Sử dụng từ khóa đơn giản và cụ thể</li>
              <li>• Thử các từ đồng nghĩa</li>
              <li>• Kiểm tra lỗi chính tả</li>
              <li>• Sử dụng ít từ hơn để có kết quả rộng hơn</li>
            </ul>
          </div>
        </div>

        {/* Trending Searches */}
        {hasSearched && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <MdTrendingUp className="w-4 h-4 text-red-500" />
              Tìm kiếm phổ biến
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {TRENDING_SEARCHES.map((trend) => (
                <button
                  key={trend}
                  onClick={() => handleTrendingClick(trend)}
                  className="px-3 py-2 text-sm bg-white border border-brand-light rounded-lg
                           hover:border-brand-primary hover:bg-brand-primary/5 
                           transition-colors text-brand-dark"
                >
                  {trend}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {hasSearched && (
            <button
              onClick={onNewSearch}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 
                       rounded-xl bg-brand-primary text-white font-semibold 
                       hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl 
                       hover:-translate-y-1"
            >
              <MdSearch className="w-5 h-5" />
              Tìm kiếm mới
            </button>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/shop')}
              className="flex-1 px-4 py-2.5 rounded-xl border border-brand-light 
                       text-brand-dark hover:bg-brand-light/50 transition-colors"
            >
              Xem tất cả sản phẩm
            </button>
            <button
              onClick={() => router.push('/about')}
              className="flex-1 px-4 py-2.5 rounded-xl border border-brand-light 
                       text-brand-dark hover:bg-brand-light/50 transition-colors"
            >
              Liên hệ hỗ trợ
            </button>
          </div>
        </div>

        {/* Quick Suggestions */}
        {!hasSearched && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-brand-dark mb-3">
              Hoặc thử tìm kiếm:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (suggestion === "Browse our categories") {
                      router.push('/shop');
                    } else {
                      // For other suggestions, just show a message or implement logic
                      console.log(suggestion);
                    }
                  }}
                  className="text-xs px-3 py-2 text-brand-secondary 
                           hover:text-brand-primary transition-colors 
                           text-left border-b border-dashed border-brand-light/50 
                           hover:border-brand-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}