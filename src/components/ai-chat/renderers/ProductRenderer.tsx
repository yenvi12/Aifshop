import React, { useState } from 'react';
import { MdShoppingCart, MdInfo, MdStar } from 'react-icons/md';
import Link from 'next/link';

interface ProductRendererProps {
  productId: string;
  onClick?: (productId: string) => void;
  className?: string;
}

// Mock product data - in real app, this would come from API or context
const mockProducts: Record<string, {
  name: string;
  price: number;
  image?: string;
  slug?: string;
  rating?: number;
  description?: string;
}> = {
  'ring001': {
    name: 'Nhẫn Kim Cương Vàng 18K',
    price: 15000000,
    image: '/demo/ring1.jpg',
    slug: 'nhan-kim-cuong-vang-18k',
    rating: 4.8,
    description: 'Nhẫn kim cương tự nhiên, vàng 18K cao cấp'
  },
  'necklace001': {
    name: 'Dây Chuyền Bạc 925',
    price: 2500000,
    image: '/demo/necklace1.jpg',
    slug: 'day-chuyen-bac-925',
    rating: 4.5,
    description: 'Dây chuyền bạc 925 thiết kế tinh tế'
  }
};

export default function ProductRenderer({ 
  productId, 
  onClick, 
  className = '' 
}: ProductRendererProps) {
  const [isLoading, setIsLoading] = useState(false);
  const product = mockProducts[productId];

  if (!product) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-brand-light/60 rounded-lg ${className}`}>
        <MdInfo className="w-4 h-4 text-brand-secondary" />
        <span className="text-sm text-brand-secondary">Sản phẩm không tìm thấy: {productId}</span>
      </div>
    );
  }

  const handleProductClick = () => {
    if (onClick) {
      setIsLoading(true);
      onClick(productId);
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Add to cart logic here
    console.log('Adding to cart:', productId);
  };

  return (
    <div className={`bg-white rounded-lg border border-brand-light p-3 mb-2 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex gap-3">
        {/* Product Image */}
        <div className="flex-shrink-0 w-16 h-16 bg-brand-light rounded-lg overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
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
          <h4 className="text-sm font-semibold text-brand-dark truncate mb-1">
            {product.name}
          </h4>
          
          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1 mb-1">
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

          {/* Price */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-brand-primary">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {product.slug && (
              <Link
                href={`/products/${product.slug}`}
                className="flex-1 text-center px-2 py-1 text-xs bg-brand-light/60 text-brand-dark rounded hover:bg-brand-light transition-colors"
              >
                Xem chi tiết
              </Link>
            )}
            
            {onClick && (
              <button
                onClick={handleProductClick}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <MdShoppingCart className="w-3 h-3" />
                    <span>Tư vấn</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}