'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiHeart, FiX, FiMinus, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Interface for cart item from API
interface CartItem {
  id: string;
  quantity: number;
  size: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image: string | null;
    images: any;
    stock: number;
    sizes: any;
    badge: string | null;
    slug: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: CartItem[];
  error?: string;
}

const CartPage = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // Fetch cart items from API
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login to view cart');
        return;
      }

      const response = await fetch('/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setCartItems(data.data);
        setError(null);
      } else {
        setError(data.error || 'Unable to load cart');
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity via API
  const updateQuantity = async (productId: string, newQuantity: number, size?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      if (newQuantity <= 0) {
        // Remove item if quantity is 0 or negative
        await removeItem(productId, size);
        return;
      }

      // Optimistically update UI first
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.product.id === productId && item.size === size
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity: newQuantity,
          size: size || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh cart items to get latest data
        await fetchCartItems();
        // Show success toast for quantity update
        toast.success(data.message || 'Product quantity updated');

        // Send event to update cart count in Header and other components
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        // Revert optimistic update on error
        await fetchCartItems();

        // Show specific error message for stock issues
        if (data.error && data.error.includes('stock')) {
          toast.error('Insufficient stock available');
        } else {
          toast.error(data.error || 'Unable to update quantity');
        }
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
      // Revert optimistic update on error
       await fetchCartItems();
       toast.error('Unable to connect to server');
    }
  };

  // Remove item from cart via API
  const removeItem = async (productId: string, size?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      // Optimistically remove item from UI
      setCartItems(prevItems =>
        prevItems.filter(item =>
          !(item.product.id === productId && item.size === size)
        )
      );

      const params = new URLSearchParams({ productId });
      if (size) params.append('size', size);

      const response = await fetch(`/api/cart?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh cart items to ensure consistency
          await fetchCartItems();
          toast.success(data.message || 'Product removed from cart');

          // Send event to update cart count in Header and other components
          window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        // Revert optimistic update on error
         await fetchCartItems();
         toast.error(data.error || 'Unable to remove product');
      }
    } catch (err) {
      console.error('Error removing item:', err);
      // Revert optimistic update on error
       await fetchCartItems();
       toast.error('Unable to connect to server');
    }
  };

  // Fetch recommended products from API
  const fetchRecommendedProducts = async () => {
    try {
      setRecommendedLoading(true);
      const response = await fetch('/api/products?limit=4');

      const data = await response.json();

      if (data.success && data.data) {
        setRecommendedProducts(data.data);
      } else {
        console.error('Failed to fetch recommended products');
      }
    } catch (err) {
      console.error('Error fetching recommended products:', err);
    } finally {
      setRecommendedLoading(false);
    }
  };

  // Load cart items on component mount
  useEffect(() => {
    fetchCartItems();
    fetchRecommendedProducts();
  }, []);

  // Handle quantity update from UI
  const handleUpdateQuantity = (item: CartItem, newQuantity: number) => {
    // Validate quantity client-side before sending request
    if (newQuantity > item.product.stock) {
      toast.error(`Chỉ còn ${item.product.stock} sản phẩm trong kho`);
      return;
    }

    if (newQuantity < 1) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }

    updateQuantity(item.product.id, newQuantity, item.size);
  };

  // Handle item removal from UI
  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.product.id, item.size);
  };

  // Handle continue shopping navigation
  const handleContinueShopping = () => {
    router.push('/shop');
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.price || item.product.compareAtPrice || 0;
    return sum + (price * item.quantity);
  }, 0);
  const total = subtotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Shopping Cart</h1>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-blue-600">{cartItems.length} items</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-500 text-lg mt-2">Loading cart...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg mb-4">{error}</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Your cart is empty</p>
            <button
              onClick={handleContinueShopping}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={`${item.product.id}-${item.size || 'no-size'}`} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image || '/demo/placeholder.jpg'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight">{item.product.name}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        {item.product.badge && (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                            {item.product.badge}
                          </span>
                        )}
                        {item.size && (
                          <span className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full font-medium">
                            Size: {item.size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-700 font-medium">{item.product.stock} trong kho</span>
                        </div>
                      </div>

                      {/* Quantity Controls and Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-gray-50 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className={`w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center transition-all duration-200 ${
                                item.quantity <= 1
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-white hover:shadow-sm'
                              }`}
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-semibold text-base">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              className={`w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center transition-all duration-200 ${
                                item.quantity >= item.product.stock
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-white hover:shadow-sm'
                              }`}
                              title={
                                item.quantity >= item.product.stock
                                  ? `Only left ${item.product.stock} items in stock`
                                  : 'Add item'
                              }
                            >
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200">
                            <FiHeart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="text-lg font-bold text-gray-900">
                        {item.product.price
                          ? `${item.product.price.toLocaleString('vi-VN')}₫`
                          : item.product.compareAtPrice
                            ? `${item.product.compareAtPrice.toLocaleString('vi-VN')}₫`
                            : '0₫'
                        }
                      </div>
                      {item.product.compareAtPrice && item.product.compareAtPrice > (item.product.price || item.product.compareAtPrice) && (
                        <div className="text-sm text-gray-500 line-through">
                          {item.product.compareAtPrice.toLocaleString('vi-VN')}₫
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100">
                <button
                  onClick={handleContinueShopping}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="text-sm text-gray-600 mb-4">
                  Code: AIF-2025
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{subtotal.toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">{total.toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800">
                      Apply
                    </button>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/payment')}
                    className="w-full bg-gray-900 text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                  >
                    Checkout Now
                  </button>
                  <button
                    onClick={() => router.push('/payment')}
                    className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Products */}
        {cartItems.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-8">Recommended for you</h2>
            {recommendedLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-lg mt-2">Loading recommended products...</p>
              </div>
            ) : recommendedProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={product.image || '/demo/placeholder.jpg'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {product.sizes && product.sizes.length > 0
                          ? `${product.sizes.join(', ')}`
                          : 'No sizes available'
                        }
                      </p>
                      <div className="text-lg font-bold text-gray-900">
                        {product.price || product.compareAtPrice ? (product.price || product.compareAtPrice).toLocaleString('vi-VN') + '₫' : '0₫'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No recommended products available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;