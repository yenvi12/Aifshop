"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MdShoppingCart, MdStar, MdInfo } from "react-icons/md";

interface Product {
  id: string;
  name: string;
  // price: luôn là giá hiển thị cuối cùng cho khách
  price?: number | null;
  // compareAtPrice: giá gốc (gạch ngang) nếu có khuyến mãi
  compareAtPrice?: number | null;
  image?: string;
  slug?: string;
  rating?: number;
  badge?: string;
}

interface ProductSuggestionProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  compact?: boolean;
}

export default function ProductSuggestion({ 
  products, 
  onAddToCart, 
  compact = false 
}: ProductSuggestionProps) {
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const handleAddToCart = async (product: Product) => {
    if (!onAddToCart) return;

    setLoadingProductId(product.id);
    try {
      await onAddToCart(product);
    } finally {
      setLoadingProductId(null);
    }
  };

  if (products.length === 0) return null;

  return (
    <div className={`
      ${compact ? 'p-2' : 'p-4'}
      bg-brand-light/20 rounded-lg border border-brand-light
    `}>
      <div className="flex items-center gap-2 mb-3">
        <MdInfo className="w-4 h-4 text-brand-primary" />
        <span className="text-sm font-medium text-brand-dark">
          Sản phẩm gợi ý ({products.length})
        </span>
      </div>

      <div className={`
        ${compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}
      `}>
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg p-3 border border-brand-light hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex gap-3">
              {/* Product Image */}
              <div className="flex-shrink-0 w-16 h-16 bg-brand-light rounded-lg overflow-hidden">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-secondary">
                    💍
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-brand-dark truncate">
                  {product.name}
                </h4>
                
                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <MdStar
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(product.rating!)
                              ? 'text-amber-400 fill-current'
                              : 'text-brand-light'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-brand-secondary ml-1">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Price and Badge */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-primary">
                      {typeof product.price === 'number' && product.price > 0
                        ? `${product.price.toLocaleString('vi-VN')}₫`
                        : 'Liên hệ'}
                    </span>
                    {typeof product.price === 'number' &&
                      product.price > 0 &&
                      typeof product.compareAtPrice === 'number' &&
                      product.compareAtPrice > product.price && (
                        <span className="text-xs text-brand-secondary line-through">
                          {product.compareAtPrice.toLocaleString('vi-VN')}₫
                        </span>
                      )}
                    {product.badge && (
                      <span className="px-2 py-0.5 bg-brand-accent text-brand-dark text-xs rounded-full">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {product.slug && (
                <Link
                  href={`/products/${product.slug}`}
                  className="flex-1 text-center px-3 py-1.5 text-xs bg-brand-light/60 text-brand-dark rounded-lg hover:bg-brand-light transition-colors"
                >
                  Xem chi tiết
                </Link>
              )}
              
              {onAddToCart && (
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={loadingProductId === product.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingProductId === product.id ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MdShoppingCart className="w-3 h-3" />
                      <span>Thêm</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Products Link */}
      {!compact && products.length >= 2 && (
        <div className="mt-3 pt-3 border-t border-brand-light">
          <Link
            href="/shop"
            className="flex items-center justify-center gap-2 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            <span>Xem tất cả sản phẩm</span>
            <MdShoppingCart className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}