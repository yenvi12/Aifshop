"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { MdStar, MdFavoriteBorder, MdFavorite } from "react-icons/md";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";

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

type Product = {
  id: string;
  name: string;
  image?: string;
  price?: number;
  compareAtPrice?: number;
  slug?: string;
};

type Props = {
  product: Product & {
    description?: string;
    features?: string[];
    sizes?: SizeOption[];
    images?: string[];
    compareAtPrice?: number;
    rating?: number;
    badge?: string;
    reviews?: Review[];
  };
  relatedProducts?: Product[];
};

export default function ProductDetail({ product, relatedProducts = [] }: Props) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const [wished, setWished] = useState(false);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [reviews, setReviews] = useState<Review[]>(product.reviews || []);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, reviewId: string | null}>({show: false, reviewId: null});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Get current user ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (error) {
        setCurrentUserId(null);
      }
    } else {
      setCurrentUserId(null);
    }
  }, []);

  const images = [product.image, ...(product.images || [])].filter((img): img is string => Boolean(img && img.trim()));

  const sizes = product.sizes || [];
  const defaultSizes = sizes.length > 0 ? sizes : [{ name: "S", stock: 10 }, { name: "M", stock: 15 }, { name: "L", stock: 8 }];

  // Debug logging
  console.log("Product sizes:", sizes);
  console.log("Product sizes length:", sizes.length);
  console.log("Selected size:", selectedSize);
  console.log("Button disabled condition:", !selectedSize && sizes.length > 0);

  const discount =
    product.compareAtPrice && product.price && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  // Check if current user has already reviewed this product
  const hasUserReviewed = currentUserId && reviews.some(review => review.user.id === currentUserId);

  const handleBuyNow = () => {
    // Nếu muốn truyền dữ liệu product, có thể lưu tạm vào localStorage / context
    router.push("/payment");
  };

  // Edit review handler
  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setEditingReviewId(review.id);
    setShowReviewForm(true);
  };

  // Delete review handler
  const handleDeleteReview = async (reviewId: string) => {
    setDeleteConfirm({show: true, reviewId});
  };

  // Confirm delete review
  const confirmDeleteReview = async () => {
    if (!deleteConfirm.reviewId) return;

    setDeletingReviewId(deleteConfirm.reviewId);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
      }

      const response = await fetch(`/api/reviews?id=${deleteConfirm.reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Không thể xóa đánh giá');
      }

      // Update local reviews state
      setReviews(reviews.filter(r => r.id !== deleteConfirm.reviewId));
      toast.success('Review deleted successfully');

    } catch (error) {
      console.error('Delete review error:', error);
      toast.error('Failed to delete review. Please try again.');
    } finally {
      setDeletingReviewId(null);
      setDeleteConfirm({show: false, reviewId: null});
    }
  };

  // Review management functions
  const handleSubmitReview = async (reviewData: any) => {
    setIsSubmittingReview(true);
    try {
      const isEdit = !!reviewData.id;
      const url = isEdit ? `/api/reviews?id=${reviewData.id}` : "/api/reviews";
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit ? reviewData : { ...reviewData, productId: product.id };

      // Get auth token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('You need to login to perform this action');
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Review submission failed:', result.details)
        throw new Error(result.error || "Failed to submit review");
      }

      if (isEdit) {
        // Update existing review in state
        setReviews(reviews.map(r => r.id === reviewData.id ? result.data : r));
        toast.success('Review updated successfully');
      } else {
        // Add new review
        setReviews([result.data, ...reviews]);
        toast.success('Review submitted successfully');
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
    console.log("Add to cart clicked!");
    console.log("Product:", product.name);
    console.log("Available sizes:", sizes);
    console.log("Selected size:", selectedSize);
    console.log("Token exists:", !!localStorage.getItem("accessToken"));

    try {
      // Kiểm tra authentication
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please login to add products to cart");
        router.push("/login");
        return;
      }

      // Validate size selection if product has sizes
      if (sizes.length > 0 && !selectedSize) {
        toast.error("Please select a product size");
        return;
      }

      // Lấy thông tin giỏ hàng hiện tại để kiểm tra sản phẩm đã tồn tại chưa
      const cartResponse = await fetch('/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const cartData = await cartResponse.json();

      if (!cartData.success) {
        toast.error("Unable to retrieve cart information");
        return;
      }

      // Tìm sản phẩm trong giỏ hàng với cùng size (nếu có)
      const existingItem = cartData.data?.find((item: any) =>
        item.product.id === product.id && item.size === (selectedSize?.name || null)
      );

      // Nếu sản phẩm đã tồn tại với cùng size, tăng số lượng hiện tại lên số lượng được chọn
      // Nếu chưa tồn tại, thêm mới với số lượng được chọn
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      // Gọi API cập nhật giỏ hàng
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: newQuantity,
          size: selectedSize?.name || null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Sản phẩm đã được thêm vào giỏ hàng!");

        // Send event to update cart count in Header and other components
        window.dispatchEvent(new CustomEvent('cartUpdated'));
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
      console.error('Add to cart error:', error);
      toast.error("An error occurred while adding the product to the cart");
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                width={600}
                height={600}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === index ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MdStar
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(product.rating || 0)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">
                    ({product.rating?.toFixed(1) || "0.0"})
                  </span>
                </div>
                <span className="text-sm text-green-600">✓ In Stock</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {product.price ? `$${product.price.toFixed(2)}` : product.compareAtPrice ? `$${product.compareAtPrice.toFixed(2)}` : 'Price TBA'}
              </span>
              {product.compareAtPrice && product.price && (
                <span className="text-xl text-gray-500 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-sm px-2 py-1 bg-red-100 text-red-600 rounded">
                  Save {discount}%
                </span>
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
                <h3 className="font-semibold text-gray-900">Size {!selectedSize && sizes.length > 0 && <span className="text-red-500">*</span>}</h3>
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
                      {size.stock > 0 && (
                        <span className="block text-xs opacity-75">
                          ({size.stock} left)
                        </span>
                      )}
                      {size.stock === 0 && (
                        <span className="block text-xs">Out of stock</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize && sizes.length > 0}
                  title={!selectedSize && sizes.length > 0 ? "Please select a size first" : "Add to cart"}
                  className="w-auto inline-block rounded-xl py-2.5 px-6 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-light/90 disabled:opacity-60 transition"
                >
                  Add to cart
                </button>


                {/* Wishlist Button */}
                <button
                  onClick={() => setWished(!wished)}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  {wished ? (
                    <MdFavorite className="w-5 h-5 text-red-500" />
                  ) : (
                    <MdFavoriteBorder className="w-5 h-5" />
                  )}
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
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-8">
            {activeTab === "description" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  {product.description || "This is a beautiful piece of jewelry crafted with attention to detail. Perfect for any occasion."}
                </p>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Reviews Header */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Product Reviews</h3>
                  {!showReviewForm && !hasUserReviewed && currentUserId && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={editingReviewId !== null}
                    >
                      {editingReviewId ? 'Loading...' : 'Write Review'}
                    </button>
                  )}
                </div>

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
                    <p className="text-sm text-gray-600">Free shipping on orders over $50</p>
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
                      src={relatedProduct.image || '/demo/dc10.jpg'}
                      alt={relatedProduct.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <h3 className="font-semibold mb-1">{relatedProduct.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {relatedProduct.price ? `$${relatedProduct.price.toFixed(2)}` : 'Price TBA'}
                    </span>
                    {relatedProduct.compareAtPrice && relatedProduct.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ${relatedProduct.compareAtPrice.toFixed(2)}
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
                  onClick={() => setDeleteConfirm({show: false, reviewId: null})}
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
                  {deletingReviewId ? 'Deleting...' : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


