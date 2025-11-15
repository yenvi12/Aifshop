"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiHeart, FiX, FiMinus, FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import {
  loadGuestCart,
  saveGuestCart,
  getGuestCartCount,
} from "@/lib/guestCart";

// Interface for cart item (server or guest)
interface CartItem {
  id?: string; // server items have id, guest items do not
  quantity: number;
  size: string | null;
  product: {
    id: string;
    name: string;
    price: number | null;
    compareAtPrice: number | null;
    image: string | null;
    images: string[];
    stock: number;
    sizes: Array<{ name: string; stock: number }> | null;
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
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Fetch cart items:
  // - If logged in: from /api/cart
  // - If guest: from local guest cart (loadGuestCart + fetch product details)
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      if (!token) {
        // Guest mode
        setIsGuest(true);
        const guest = loadGuestCart();
        if (!guest.items.length) {
          setCartItems([]);
          setInfoMessage("Bạn đang mua sắm với tư cách khách. Giỏ hàng đang trống.");
          return;
        }

        // Fetch product details for all items in guest cart
        const ids = Array.from(new Set(guest.items.map((i) => i.productId)));
        const query = ids.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
        const res = await fetch(`/api/products?${query}`);
        if (!res.ok) {
          setError("Không thể tải thông tin giỏ hàng");
          setCartItems([]);
          return;
        }
        const result = await res.json();
        if (!result.success || !result.data) {
          setError("Không thể tải thông tin giỏ hàng");
          setCartItems([]);
          return;
        }

        const productMap: Record<string, any> = {};
        for (const p of result.data) {
          productMap[p.id] = p;
        }

        const normalized: CartItem[] = [];
        const invalidItems: string[] = [];

        for (const item of guest.items) {
          const p = productMap[item.productId];
          if (!p || !p.isActive || (p.stock !== undefined && p.stock <= 0)) {
            invalidItems.push(item.productId);
            continue;
          }

          // Validate size if provided
          let sizeValid = true;
          if (item.size && p.sizes) {
            const sizes = p.sizes as { name: string; stock: number }[];
            const found = sizes.find((s) => s.name === item.size);
            if (!found || found.stock <= 0) {
              sizeValid = false;
            }
          }

          if (!sizeValid) {
            invalidItems.push(`${item.productId}:${item.size || ""}`);
            continue;
          }

          normalized.push({
            quantity: item.quantity,
            size: item.size || null,
            product: {
              id: p.id,
              name: p.name,
              price: p.price ?? null,
              compareAtPrice: p.compareAtPrice ?? null,
              image: p.image ?? null,
              images: p.images || [],
              stock: p.stock ?? 0,
              sizes: (p.sizes as Array<{ name: string; stock: number }>) || null,
              badge: p.badge ?? null,
              slug: p.slug,
            },
          });
        }

        setCartItems(normalized);

        // If some items invalid, notify user
        if (invalidItems.length > 0) {
          setInfoMessage(
            "Một số sản phẩm trong giỏ hàng tạm thời không còn khả dụng và đã được loại bỏ."
          );
          // Clean guest cart to remove invalid items
          const cleaned = {
            ...guest,
            items: guest.items.filter((i) =>
              normalized.some(
                (n) =>
                  n.product.id === i.productId &&
                  (n.size || null) === (i.size || null)
              )
            ),
          };
          saveGuestCart(cleaned);
        }

        return;
      }

      // Logged-in: load from API
      setIsGuest(false);
      const response = await fetch("/api/cart", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setCartItems(data.data);
        setError(null);
      } else {
        setError(data.error || "Unable to load cart");
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (
    productId: string,
    newQuantity: number,
    size?: string | null
  ) => {
    if (newQuantity <= 0) {
      await removeItem(productId, size);
      return;
    }

    // Guest cart update
    if (isGuest) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.size === (size ?? null)
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      const guest = loadGuestCart();
      const updated = {
        ...guest,
        items: guest.items.map((i) =>
          i.productId === productId && (i.size ?? null) === (size ?? null)
            ? { ...i, quantity: newQuantity }
            : i
        ),
      };
      saveGuestCart(updated);
      toast.success("Đã cập nhật số lượng sản phẩm");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      return;
    }

    // Logged-in: server update
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      // Optimistic UI
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.product.id === productId && item.size === size
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          quantity: newQuantity,
          size: size || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCartItems();
        toast.success(data.message || "Product quantity updated");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        await fetchCartItems();
        if (data.error && data.error.includes("stock")) {
          toast.error("Insufficient stock available");
        } else {
          toast.error(data.error || "Unable to update quantity");
        }
      }
    } catch (err) {
      console.error("Error updating quantity:", err);
      await fetchCartItems();
      toast.error("Unable to connect to server");
    }
  };

  // Remove item
  const removeItem = async (productId: string, size?: string | null) => {
    // Guest: update local cart only
    if (isGuest) {
      setCartItems((prevItems) =>
        prevItems.filter(
          (item) => !(item.product.id === productId && item.size === (size ?? null))
        )
      );
      const guest = loadGuestCart();
      const cleaned = {
        ...guest,
        items: guest.items.filter(
          (i) =>
            !(
              i.productId === productId &&
              (i.size ?? null) === (size ?? null)
            )
        ),
      };
      saveGuestCart(cleaned);
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      return;
    }

    // Logged-in: call API
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      // Optimistically remove item from UI
      setCartItems((prevItems) =>
        prevItems.filter(
          (item) => !(item.product.id === productId && item.size === size)
        )
      );

      const params = new URLSearchParams({ productId });
      if (size) params.append("size", size);

      const response = await fetch(`/api/cart?${params.toString()}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        await fetchCartItems();
        toast.success(data.message || "Product removed from cart");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        await fetchCartItems();
        toast.error(data.error || "Unable to remove product");
      }
    } catch (err) {
      console.error("Error removing item:", err);
      await fetchCartItems();
      toast.error("Unable to connect to server");
    }
  };

  // Fetch recommended products from API (currently unused)
   const fetchRecommendedProducts = async () => {
     try {
       setRecommendedLoading(true);
       const response = await fetch("/api/products?limit=4");

       const data = await response.json();

       if (data.success && data.data) {
         // Recommended products functionality could be implemented later
         console.log("Recommended products fetched:", data.data);
       } else {
         console.error("Failed to fetch recommended products");
       }
     } catch (err) {
       console.error("Error fetching recommended products:", err);
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
    if (newQuantity > item.product.stock) {
      toast.error(`Chỉ còn ${item.product.stock} sản phẩm trong kho`);
      return;
    }
    if (newQuantity < 1) {
      toast.error("Số lượng phải lớn hơn 0");
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
    router.push("/shop");
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.price || item.product.compareAtPrice || 0;
    return sum + price * item.quantity;
  }, 0);
  const total = subtotal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light/40 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">
            Your Shopping Cart
          </h1>
          <div className="text-sm text-brand-secondary">
            <span className="font-medium text-brand-primary">
              {cartItems.length} items
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
            <p className="text-brand-secondary text-lg mt-2">Loading cart...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg mb-4">{error}</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-brand-secondary text-lg">
              {isGuest
                ? "Giỏ hàng của bạn đang trống. Thêm sản phẩm để bắt đầu."
                : "Your cart is empty"}
            </p>
            <button
              onClick={handleContinueShopping}
              className="mt-4 rounded-xl px-6 py-2 bg-brand-primary text-white hover:brightness-110 hover:shadow-smooth transition-all"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.size || "no-size"}`}
                  className="bg-white rounded-2xl border border-brand-light p-6 shadow-sm hover:shadow-smooth transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-brand-soft rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image || "/demo/placeholder.jpg"}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-semibold text-brand-dark text-lg leading-tight">
                        {item.product.name}
                      </h3>

                      <div className="flex items-center gap-3 text-sm">
                        {item.product.badge && (
                          <span className="px-3 py-1.5 rounded-full font-medium bg-brand-light text-brand-primary">
                            {item.product.badge}
                          </span>
                        )}
                        {item.size && (
                          <span className="px-3 py-1.5 rounded-full font-medium bg-brand-soft text-brand-dark">
                            Size: {item.size}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-full border border-emerald-100">
                          <svg
                            className="w-4 h-4 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-green-700 font-medium">
                            {(() => {
                              const sizes = item.product.sizes as
                                | { name: string; stock: number }[]
                                | undefined;
                              if (sizes && item.size) {
                                const selectedSize = sizes.find(
                                  (s) => s.name === item.size
                                );
                                return selectedSize
                                  ? `${selectedSize.stock} trong kho`
                                  : "Không có thông tin tồn kho";
                              }
                              return `${item.product.stock} trong kho`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls and Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-brand-light">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-brand-soft rounded-lg p-1 border border-brand-light">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              className={`w-8 h-8 rounded-md border border-brand-light flex items-center justify-center transition-all duration-200 ${item.quantity <= 1
                                  ? "opacity-50 cursor-not-allowed"
                                  : "bg-white hover:shadow-sm"
                                }`}
                            >
                              <FiMinus className="w-4 h-4 text-brand-dark" />
                            </button>
                            <span className="w-12 text-center font-semibold text-base text-brand-dark">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.product.stock}
                              className={`w-8 h-8 rounded-md border border-brand-light flex items-center justify-center transition-all duration-200 ${item.quantity >= item.product.stock
                                  ? "opacity-50 cursor-not-allowed"
                                  : "bg-white hover:shadow-sm"
                                }`}
                              title={
                                item.quantity >= item.product.stock
                                  ? `Only left ${item.product.stock} items in stock`
                                  : "Add item"
                              }
                            >
                              <FiPlus className="w-4 h-4 text-brand-dark" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button className="p-2 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                            <FiHeart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="p-2 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="text-lg font-bold text-brand-dark">
                        {item.product.price
                          ? `${item.product.price.toLocaleString("vi-VN")}₫`
                          : item.product.compareAtPrice
                            ? `${item.product.compareAtPrice.toLocaleString(
                              "vi-VN"
                            )}₫`
                            : "0₫"}
                      </div>
                      {item.product.compareAtPrice &&
                        item.product.compareAtPrice >
                        (item.product.price ||
                          item.product.compareAtPrice) && (
                          <div className="text-sm text-brand-secondary line-through">
                            {item.product.compareAtPrice.toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 mt-6 border-t border-brand-light">
                <button
                  onClick={handleContinueShopping}
                  className="flex items-center gap-2 text-brand-dark hover:text-brand-primary transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16l-4-4m0 0l4-4m-4 4h18"
                    />
                  </svg>
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-brand-light p-6 shadow-sm sticky top-6">
                <h2 className="text-lg font-bold text-brand-dark mb-1">
                  Order Summary
                </h2>

                {isGuest && (
                  <p className="text-xs text-amber-600 mb-3">
                    Bạn đang sử dụng giỏ hàng tạm dành cho khách. Đăng nhập hoặc tiếp tục đến bước thanh toán, chúng tôi sẽ đồng bộ giỏ hàng với tài khoản của bạn.
                  </p>
                )}

                {!isGuest && infoMessage && (
                  <p className="text-xs text-amber-600 mb-3">
                    {infoMessage}
                  </p>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-brand-secondary">Subtotal</span>
                    <span className="font-medium text-brand-dark">
                      {subtotal.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                  <div className="border-t border-brand-light pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-brand-dark">
                        Total
                      </span>
                      <span className="text-xl font-bold text-brand-dark">
                        {total.toLocaleString("vi-VN")}₫
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // Nếu guest -> điều hướng login với redirect; nếu đã login -> sang /payment
                      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                      if (!token) {
                        router.push("/login?redirect=/payment");
                      } else {
                        router.push("/payment");
                      }
                    }}
                    className="w-full py-3 rounded-xl font-semibold
               bg-brand-secondary text-brand-dark border border-brand-light
               hover:bg-brand-secondary/90 hover:shadow-md
               transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-primary/25"
                  >
                    {isGuest ? "Đăng nhập để thanh toán" : "Checkout Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
