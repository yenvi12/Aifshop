"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { MdStar, MdFavoriteBorder, MdFavorite, MdMessage, MdSmartToy, MdShoppingCart } from "react-icons/md";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import { useChat } from "@/contexts/ChatContext";
import { ProductDescription } from "./product-description";

type SizeOption = {
  name: string;
  stock: number;
};

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
};

type ReviewData = {
  id?: string;
  rating: number;
  comment: string;
  images?: string[];
  videos?: string[];
  productId?: string;
};

type CartItem = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  size: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image: string | null;
    images: string[];
    stock: number;
    sizes: {
      name: string;
      stock: number;
    }[] | null;
    badge: string | null;
    slug: string;
  };
};

type Product = {
  id: string;
  name: string;
  image?: string;
  price?: number;
  compareAtPrice?: number;
  slug?: string;
  category?: string;
};

type Props = {
  product: Product & {
    overview?: string; // Mô tả tổng quan ngắn gọn (cho Overview section)
    description?: string; // Mô tả chi tiết đầy đủ (cho Detailed Description section)
    features?: string[];
    sizes?: SizeOption[];
    images?: string[];
    compareAtPrice?: number;
    rating?: number;
    badge?: string;
    reviews?: Review[];
    specifications?: Record<string, string>;
    careInstructions?: Array<{
      title: string;
      content: string;
      icon?: string;
    }>;
    media?: {
      videos?: string[];
      images?: string[];
    };
  };
  relatedProducts?: Product[];
};

export default function ProductDetail({ product, relatedProducts = [] }: Props) {
  const router = useRouter();
  const { openChat } = useChat();
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const [wished, setWished] = useState(false);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [reviews, setReviews] = useState<Review[]>(product.reviews || []);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; reviewId: string | null }>({ show: false, reviewId: null });
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [reviewEligibility, setReviewEligibility] = useState<{ canReview: boolean; reason: string } | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  // Check review eligibility when user or product changes
  const checkReviewEligibility = async () => {
    if (!currentUserId || !product.id) {
      setReviewEligibility(null);
      return;
    }

    setIsCheckingEligibility(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/reviews/eligibility?productId=${product.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setReviewEligibility({
          canReview: result.canReview,
          reason: result.reason
        });
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setReviewEligibility({ canReview: false, reason: 'Không thể kiểm tra quyền review' });
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  // Get current user ID and role from JWT token
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId || payload.supabaseUserId);
        setCurrentUserRole(payload.role);
      } catch (error) {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
    } else {
      setCurrentUserId(null);
      setCurrentUserRole(null);
    }
  }, []);

  // Check review eligibility when user changes
  useEffect(() => {
    if (currentUserId && product.id) {
      checkReviewEligibility();
    }
  }, [currentUserId, product.id]);

  // Auto-open Reviews tab if ?review=1; only open form if user has review permissions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") !== "1") return;

    // Always switch to Reviews tab
    setActiveTab("reviews");

    // Wait until we know currentUserId and eligibility; then decide to open/close the form
    if (!currentUserId || !reviewEligibility) return;

    const alreadyReviewed = reviews.some((r) => r.user.id === currentUserId);
    if (alreadyReviewed) {
      // User already reviewed this product -> do NOT open the form
      setShowReviewForm(false);
      toast("You have already reviewed this product");
    } else if (reviewEligibility.canReview) {
      // User can review -> open the form
      setShowReviewForm(true);
    } else {
      // User cannot review -> show eligibility reason
      setShowReviewForm(false);
      toast(reviewEligibility.reason);
    }
  }, [currentUserId, reviews, reviewEligibility]);

  const images = [product.image, ...(product.images || [])].filter((img): img is string => Boolean(img && img.trim()));
  const sizes = product.sizes || [];
  const defaultSizes = sizes.length > 0 ? sizes : [{ name: "S", stock: 10 }, { name: "M", stock: 15 }, { name: "L", stock: 8 }];

  const discount =
    product.compareAtPrice && product.price && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  // Check if current user has already reviewed this product
  const hasUserReviewed = currentUserId && reviews.some((review) => review.user.id === currentUserId);

  const handleMessage = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.userId;
      const conversationId = `${userId}-${product.id}`;
      router.push(`/messenger/${conversationId}`);
    } catch (error) {
      console.error("Error parsing token:", error);
      toast.error("Authentication error. Please log in again.");
      router.push("/login");
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setEditingReviewId(review.id);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeleteConfirm({ show: true, reviewId });
  };

  const confirmDeleteReview = async () => {
    if (!deleteConfirm.reviewId) return;

    setDeletingReviewId(deleteConfirm.reviewId);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Bạn cần đăng nhập để thực hiện thao tác này");
      }

      const response = await fetch(`/api/reviews?id=${deleteConfirm.reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Không thể xóa đánh giá");
      }

      setReviews(reviews.filter((r) => r.id !== deleteConfirm.reviewId));
      toast.success("Review deleted successfully");
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error("Failed to delete review. Please try again.");
    } finally {
      setDeletingReviewId(null);
      setDeleteConfirm({ show: false, reviewId: null });
    }
  };

  const handleSubmitReview = async (reviewData: ReviewData) => {
    setIsSubmittingReview(true);
    try {
      const isEdit = !!reviewData.id;
      const url = isEdit ? `/api/reviews?id=${reviewData.id}` : "/api/reviews";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? reviewData : { ...reviewData, productId: product.id };

      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("You need to login to perform this action");

      const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Failed to submit review");

      if (isEdit) {
        setReviews(reviews.map((r) => (r.id === reviewData.id ? result.data : r)));
        toast.success("Review updated successfully");
      } else {
        setReviews([result.data, ...reviews]);
        toast.success("Review submitted successfully");
      }

      setShowReviewForm(false);
      setEditingReview(null);
      setEditingReviewId(null);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please login to add products to cart");
        router.push("/login");
        return;
      }

      if (sizes.length > 0 && !selectedSize) {
        toast.error("Please select a product size");
        return;
      }

      const cartResponse = await fetch("/api/cart", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const cartData = await cartResponse.json();
      if (!cartData.success) {
        toast.error("Unable to retrieve cart information");
        return;
      }

      const existingItem = cartData.data?.find((item: CartItem) => item.product.id === product.id && item.size === (selectedSize?.name || null));
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: newQuantity,
          size: selectedSize?.name || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Sản phẩm đã được thêm vào giỏ hàng!");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          router.push("/login");
        } else if (response.status === 400) {
          toast.error(data.error || "Invalid product information");
        } else if (response.status === 404) {
          toast.error("Product not found");
        } else {
          toast.error(data.error || "Unable to add product to cart");
        }
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("An error occurred while adding the product to the cart");
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image – hiệu ứng đẹp */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-md">
              <Image
                key={images[selectedImage]}
                src={images[selectedImage]}
                alt={product.name}
                width={1200}
                height={1200}
                className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] animate-fade-in"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />
            </div>

            {/* Thumbnail Images – ring + hover */}
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, index) => {
                const active = selectedImage === index;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-xl overflow-hidden border transition-all duration-300 focus:outline-none ${
                      active
                        ? "border-brand-primary ring-2 ring-brand-primary/40 shadow-lg scale-[1.03]"
                        : "border-gray-200 hover:-translate-y-[2px] hover:shadow-md"
                    }`}
                    aria-label={`Preview ${index + 1}`}
                  >
                    <Image src={img} alt={`${product.name} ${index + 1}`} width={200} height={200} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MdStar key={i} className={`w-5 h-5 ${i < Math.round(product.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">({product.rating?.toFixed(1) || "0.0"})</span>
                </div>
                <span className="text-sm text-green-600">✓ In Stock</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {product.price
                  ? `${product.price.toLocaleString("vi-VN")}₫`
                  : product.compareAtPrice
                  ? `${product.compareAtPrice.toLocaleString("vi-VN")}₫`
                  : "Price TBA"}
              </span>
              {product.compareAtPrice && product.price && (
                <span className="text-xl text-gray-500 line-through">{product.compareAtPrice.toLocaleString("vi-VN")}₫</span>
              )}
              {discount > 0 && (
                <span className="text-sm px-2 py-1 bg-red-100 text-red-600 rounded">Save {discount}%</span>
              )}
            </div>

            {/* Features */}
            {product.features && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Features:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Size Selection - Only show if product has custom sizes */}
            {sizes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Size {!selectedSize && sizes.length > 0 && <span className="text-red-500">*</span>}
                </h3>
                <div className="flex gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size.name}
                      onClick={() => setSelectedSize(size)}
                      disabled={size.stock === 0}
                      className={`px-4 py-2 border rounded-lg font-medium transition ${
                        selectedSize?.name === size.name
                          ? "border-brand-primary bg-brand-primary text-white"
                          : size.stock === 0
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {size.name}
                      {size.stock > 0 && <span className="block text-xs opacity-75">({size.stock} left)</span>}
                      {size.stock === 0 && <span className="block text-xs">Out of stock</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
<div className="space-y-3">
  {/* --- Hàng 1: Add to cart, Wishlist --- */}
  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
    {/* Add to Cart */}
    <button
      onClick={handleAddToCart}
      disabled={!selectedSize && sizes.length > 0}
      title={
        !selectedSize && sizes.length > 0
          ? "Please select a size first"
          : "Add to cart"
      }
      className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-6
                 bg-brand-accent text-brand-dark font-semibold border border-brand-light
                 hover:border-brand-primary hover:brightness-110
                 hover:shadow-lg hover:shadow-brand-accent/30 hover:scale-[1.02]
                 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none
                 transition-all duration-300 focus:ring-4 focus:ring-brand-primary/30 focus:outline-none"
    >
      Add to cart
    </button>

    {/* ❤️ Wishlist */}
    <button
      onClick={() => setWished(!wished)}
      title={wished ? "Remove from wishlist" : "Add to wishlist"}
      className="inline-flex items-center justify-center rounded-xl h-11 w-11
                 border border-gray-300 hover:bg-gray-100
                 transition-all duration-300 focus:ring-4 focus:ring-brand-primary/30 focus:outline-none"
    >
      {wished ? (
        <MdFavorite className="w-5 h-5 text-red-500" />
      ) : (
        <MdFavoriteBorder className="w-5 h-5 text-brand-dark" />
      )}
    </button>
  </div>

  {/* --- Hàng 2: Message & AI --- */}
  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
    {/* Message */}
    {currentUserRole && currentUserRole !== "ADMIN" && (
      <button
        onClick={handleMessage}
        disabled={!currentUserId}
        title={!currentUserId ? "Please login to message" : "Message seller"}
        className="group relative inline-flex items-center justify-center gap-2 rounded-xl h-11 px-6
                   bg-gradient-to-r from-[#0088cc] to-[#0077b3] text-white font-bold
                   border-2 border-[#0088cc] hover:border-[#0077b3]
                   hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]
                   disabled:opacity-60 disabled:hover:scale-100
                   transition-all duration-300 focus:ring-4 focus:ring-blue-300 focus:outline-none"
      >
        <MdMessage
          className={`w-5 h-5 transition-transform duration-300 ${
            !currentUserId ? "" : "group-hover:scale-110 group-hover:animate-pulse"
          }`}
        />
        <span>Message</span>
        {!currentUserId && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    )}

    {/* AI */}
    <button
      onClick={() => openChat({
        productId: product.id,
        productName: product.name,
        productPrice: product.price || null,
        productCompareAtPrice: product.compareAtPrice || null,
        productCategory: product.category || 'trang sức',
        productImage: product.image || undefined,
        productDescription: product.description || undefined,
        productSizes: sizes || undefined
      })}
      aria-label="Ask AI"
      title="Ask AI for product advice"
      className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-6
                 bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#ec4899]
                 text-white font-bold border-2 border-transparent
                 hover:shadow-lg hover:shadow-pink-500/40 hover:scale-[1.02]
                 disabled:opacity-60 disabled:hover:scale-100
                 transition-all duration-300 focus:ring-4 focus:ring-pink-300 focus:outline-none"
    >
      <MdSmartToy className="w-5 h-5" />
      <span>AI</span>
    </button>
  </div>
</div>




            {/* Additional Info */}
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">🚚</span>
                <span>Free shipping worldwide</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">💳</span>
                <span>100% Secured Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">👨‍💼</span>
                <span>Made by the Professionals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {["description", "reviews", "support"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === tab ? "border-brand-primary text-brand-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-8">
            {activeTab === "description" && (
              <ProductDescription
                overview={product.overview}
                description={product.description}
                features={product.features}
                specifications={product.specifications}
                careInstructions={product.careInstructions}
                media={product.media}
              />
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Reviews Header */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Product Reviews</h3>
                  {!showReviewForm && !hasUserReviewed && currentUserId && reviewEligibility?.canReview && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={editingReviewId !== null || isCheckingEligibility}
                    >
                      {editingReviewId ? "Loading..." : "Write Review"}
                    </button>
                  )}
                </div>

                {/* Review Eligibility Message */}
                {!isCheckingEligibility && currentUserId && reviewEligibility && !reviewEligibility.canReview && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">
                          Không thể đánh giá sản phẩm
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          {reviewEligibility.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login prompt for non-authenticated users */}
                {!currentUserId && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">
                          Vui lòng{' '}
                          <button
                            onClick={() => router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`)}
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            đăng nhập
                          </button>
                          {' '}để có thể đánh giá sản phẩm này.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Review Form */}
                {showReviewForm && (
                  <ReviewForm
                    productId={product.id}
                    initialReview={editingReview || undefined}
                    onSubmit={handleSubmitReview}
                    onCancel={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                      setEditingReviewId(null);
                    }}
                    isLoading={isSubmittingReview}
                  />
                )}

                {/* Reviews List */}
                <ReviewList
                  reviews={reviews}
                  currentUserId={currentUserId}
                  onEditReview={handleEditReview}
                  onDeleteReview={handleDeleteReview}
                  editingReviewId={editingReviewId}
                  deletingReviewId={deletingReviewId}
                />
              </div>
            )}

            {activeTab === "support" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🚚</span>
                    </div>
                    <h3 className="font-semibold mb-2">Free Shipping</h3>
                    <p className="text-sm text-gray-600">Free shipping on orders over 1,150,000₫</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🔒</span>
                    </div>
                    <h3 className="font-semibold mb-2">Secure Payment</h3>
                    <p className="text-sm text-gray-600">100% secure payment processing</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">📞</span>
                    </div>
                    <h3 className="font-semibold mb-2">24/7 Support</h3>
                    <p className="text-sm text-gray-600">Get help whenever you need it</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">You might also like</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="group cursor-pointer"
                  onClick={() => relatedProduct.slug && router.push(`/products/${relatedProduct.slug}`)}
                >
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <Image
                      src={relatedProduct.image || "/demo/dc10.jpg"}
                      alt={relatedProduct.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <h3 className="font-semibold mb-1">{relatedProduct.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {relatedProduct.price
                        ? `${relatedProduct.price.toLocaleString("vi-VN")}₫`
                        : relatedProduct.compareAtPrice
                        ? `${relatedProduct.compareAtPrice.toLocaleString("vi-VN")}₫`
                        : "Price TBA"}
                    </span>
                    {relatedProduct.compareAtPrice && relatedProduct.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {relatedProduct.compareAtPrice.toLocaleString("vi-VN")}₫
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-3">Delete Review</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this review? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm({ show: false, reviewId: null })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  disabled={deletingReviewId !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteReview}
                  disabled={deletingReviewId !== null}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors duration-200"
                >
                  {deletingReviewId ? "Deleting..." : "Delete Review"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
