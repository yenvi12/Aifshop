"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MdStar, 
  MdLocalShipping, 
  MdStraighten,
  MdSmartToy,
  MdAutoAwesome,
  MdPeople,
  MdVerified,
  MdTrendingUp
} from "react-icons/md";
import { BiSupport } from "react-icons/bi";
import { HiSparkles } from "react-icons/hi";
import toast from "react-hot-toast";
import ProductCard, { type Product } from "@/components/ProductCard";
import { addGuestCartItem } from "@/lib/guestCart";
import LoadingSpinner from "@/components/LoadingSpinner";
import HeroCarouselOverlay from "@/components/HeroCarouselOverlay";
import EnhancedSearchBar from "@/components/search/EnhancedSearchBar";
import { FaBolt, FaChartLine, FaRegLightbulb, FaUsers } from "react-icons/fa";

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
  product: {
    id: string;
    name: string;
    image: string;
    slug: string;
  } | null;
};

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  images?: string[];
  badge?: string;
  rating?: number;
  sizes?: string[];
}

interface CartItem {
  product: { id: string };
  quantity: number;
}

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'sale' | 'popular'>('all');
  const [stats, setStats] = useState({
    customers: 0,
    rating: 0,
    support: 0,
    shipping: 0
  });
  

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products?limit=4");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const transformed: Product[] = result.data.map((p: ApiProduct) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              compareAtPrice: p.compareAtPrice || undefined,
              image: p.image || undefined,
              images: p.images || [],
              badge: p.badge || undefined,
              rating: p.rating || undefined,
              sizes: p.sizes || undefined,
            }));
            setProducts(transformed);
          }
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews?limit=6");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setReviews(result.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
      }
    };

    // Check authentication state
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUser({ id: payload.userId, email: payload.email });
          setAccessToken(token);
        } catch (error) {
          console.error("Invalid token:", error);
          setUser(null);
          setAccessToken(null);
        }
      } else {
        setUser(null);
        setAccessToken(null);
      }
    };

    fetchProducts();
    fetchReviews();
    checkAuth();
  }, []);

  // Animated counter effect
  useEffect(() => {
    const targetStats = {
      customers: 10000,
      rating: 4.8,
      support: 24,
      shipping: 100
    };

    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setStats({
        customers: Math.floor(targetStats.customers * progress),
        rating: Number((targetStats.rating * progress).toFixed(1)),
        support: Math.floor(targetStats.support * progress),
        shipping: Math.floor(targetStats.shipping * progress)
      });

      if (step >= steps) {
        setStats(targetStats);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);


  // Function to handle adding product to cart
  const handleAddToCart = async (product: Product) => {
    // If product has sizes -> go to detail page to choose size
    if (product.sizes && product.sizes.length > 0) {
      if (product.slug) {
        router.push(`/products/${product.slug}`);
      } else {
        toast.error("Unable to view product details");
      }
      return;
    }

    // If not logged in -> guest cart (no barrier)
    if (!user || !accessToken) {
      addGuestCartItem({ productId: product.id, quantity: 1 });
      toast.success("Đã thêm sản phẩm vào giỏ hàng");
      return;
    }

    // Logged in -> use server cart directly with upsert semantics
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          // Let backend treat missing quantity as 1 or update based on current logic
          quantity: 1,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Product added to cart!");
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          setUser(null);
          setAccessToken(null);
        } else {
          toast.error(result.error || "Unable to add product to cart");
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("An error occurred while adding the product to the cart");
    }
  };

  // Filter products based on active filter
  const getFilteredProducts = () => {
    switch (activeFilter) {
      case 'new':
        return products.filter(p => p.badge === 'New');
      case 'sale':
        return products.filter(p => p.compareAtPrice && p.price && p.compareAtPrice > p.price);
      case 'popular':
        return products.filter(p => p.rating && p.rating >= 4.5);
      default:
        return products;
    }
  };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <main className="min-h-screen" suppressHydrationWarning>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" suppressHydrationWarning={true}>
      {/* ===== HERO SEARCH BAR with elevated z-index context ===== */}

      {/* ===== HERO CAROUSEL WITH AI BADGE ===== */}
      <div className="relative max-w-7xl mx-auto px-4">
        <HeroCarouselOverlay
          className="py-6 md:py-8"
          interval={3000}
          slides={[
            { title: "Khám phá những xu hướng thời trang mới nhất", caption: "Duyệt qua bộ sưu tập các phong cách độc đáo của chúng tôi và tìm ra phong cách phù hợp nhất với bạn", cta: { label: "Mua ngay", href: "/shop" }, src: "/demo/dan-tri-0603awo-pr07-1-crop-1709803508993.webp", position: "left" },
            { title: "Trang sức tối giản, tác động tối đa", caption: "Những tác phẩm được tuyển chọn kỹ lưỡng với nét quyến rũ vượt thời gian", cta: { label: "Khám phá ngay", href: "/shop" }, src: "/demo/trang-suc-bac.avif", position: "center" },
            { title: "Trang sức bạc", caption: "Trẻ trung, đơn giản", cta: { label: "Xem ngay", href: "/shop" }, src: "/demo/trangsuc.jpg", position: "center" },
            { title: "Giày cao gót", caption: "Vẻ đẹp được đo bằng từng bước hoàn hảo", cta: { label: "Tìm hiểu ngay", href: "/shop" }, src: "/demo/giay.jpg", position: "left" },
            { title: "Túi xách tay", caption: "Một chiếc túi, muôn sắc thái của phong cách", cta: { label: "Khám phá ", href: "/shop" }, src: "/demo/tuixach.png", position: "center" },
          ]}
        />
       <div className="relative z-10">
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-4">
          {/* Search container - Compact & Prominent */}
          <div className="relative flex flex-col items-center gap-3 animate-fade-in-up-slow">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-bold text-brand-dark mb-1">
                Tìm kiếm sản phẩm yêu thích
              </h2>
              <p className="text-brand-secondary text-xs md:text-sm">
                Khám phá hàng ngàn sản phẩm chất lượng cao
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <EnhancedSearchBar
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                className=""
                showSuggestions={true}
                usePortal={true}
              />
            </div>
          </div>
        </div>
        </div>

        {/* ===== FEATURE SECTION ===== */}
<section className="py-16 bg-white">
<div className="max-w-6xl mx-auto px-4">
<h3 className="text-3xl md:text-4xl font-bold text-brand-primary text-center mb-12 pb-2 leading-tight">
<FaBolt className="inline mr-2 text-brand-accent" /> Vì sao chọn AIFShop?
</h3>
<div className="grid md:grid-cols-3 gap-6">
<div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center">
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mb-6 shadow-lg mx-auto">
<FaChartLine className="w-7 h-7 text-white" />
</div>
<h4 className="text-xl font-bold text-brand-dark mb-2">Cá nhân hoá tối ưu</h4>
<p className="text-brand-secondary text-sm leading-relaxed">
Gợi ý sản phẩm phù hợp với bạn dựa trên hành vi và sở thích mua sắm.
</p>
</div>


<div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center">
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center mb-6 shadow-lg mx-auto">
<FaRegLightbulb className="w-7 h-7 text-white" />
</div>
<h4 className="text-xl font-bold text-brand-dark mb-2">Trí tuệ nhân tạo tiên tiến</h4>
<p className="text-brand-secondary text-sm leading-relaxed">
Sử dụng AI để dự đoán xu hướng và nâng cao trải nghiệm người dùng.
</p>
</div>


<div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center">
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center mb-6 shadow-lg mx-auto">
<FaUsers className="w-7 h-7 text-white" />
</div>
<h4 className="text-xl font-bold text-brand-dark mb-2">Cộng đồng thân thiện</h4>
<p className="text-brand-secondary text-sm leading-relaxed">
Giao diện dễ dùng và hỗ trợ nhanh chóng giúp mọi người dễ tiếp cận.
</p>
</div>
</div>
</div>
</section>
        
        {/* AI-Powered Badge */}
        <div className="absolute top-12 right-8 md:top-16 md:right-16 z-30 animate-float">
          <div className="glass-card rounded-full px-4 py-2 shadow-premium flex items-center gap-2">
            <HiSparkles className="w-5 h-5 text-brand-primary" />
            <span className="text-sm font-semibold text-brand-dark">AI-Powered</span>
          </div>
        </div>
      </div>

      {/* ===== AI FEATURES SHOWCASE ===== */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4 pb-2 leading-tight">
            Trải nghiệm AI thông minh
          </h2>
          <p className="text-brand-secondary text-lg">
            Công nghệ tiên tiến giúp bạn mua sắm dễ dàng hơn
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* AI Chatbot */}
          <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mb-6 shadow-lg">
              <MdSmartToy className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-3">Trợ lý ảo Chatbot AI</h3>
            <p className="text-brand-secondary leading-relaxed">
              Trợ lý ảo thông minh hỗ trợ 24/7, trả lời mọi thắc mắc của bạn về sản phẩm, đặt hàng và chính sách
            </p>
          </div>

          {/* Smart Size Advisor */}
          <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center mb-6 shadow-lg">
              <MdStraighten className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-3">Tư vấn chọn kích thước thông minh</h3>
            <p className="text-brand-secondary leading-relaxed">
              AI phân tích số đo của bạn và đề xuất size phù hợp nhất, giảm thiểu tỷ lệ đổi trả sản phẩm
            </p>
          </div>

          {/* Personalized Recommendations */}
          <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center mb-6 shadow-lg">
              <MdAutoAwesome className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-3"> Gợi ý cá nhân hóa </h3>
            <p className="text-brand-secondary leading-relaxed">
              Gợi ý sản phẩm thông minh dựa trên sở thích, lịch sử mua sắm và xu hướng thời trang
            </p>
          </div>
        </div>
      </section>

      {/* ===== FEATURED PRODUCTS ===== */}
     <section className="max-w-6xl mx-auto px-4 py-8 md:py-10">
       <div className="text-center mb-6 md:mb-8">
         <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-dark mb-3 pb-1 leading-tight">
           Sản phẩm nổi bật
         </h2>
         <p className="text-brand-secondary text-base md:text-lg mb-6 md:mb-8">
           Khám phá bộ sưu tập được yêu thích nhất
         </p>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-brand-light text-brand-dark hover:bg-brand-primary/10'
              }`}
            >
              Tất cả sản phẩm 
            </button>
            <button
              onClick={() => setActiveFilter('new')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === 'new'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-brand-light text-brand-dark hover:bg-brand-primary/10'
              }`}
            >
              Hàng mới về
            </button>
            <button
              onClick={() => setActiveFilter('sale')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === 'sale'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-brand-light text-brand-dark hover:bg-brand-primary/10'
              }`}
            >
              On Sale
            </button>
            <button
              onClick={() => setActiveFilter('popular')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === 'popular'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-brand-light text-brand-dark hover:bg-brand-primary/10'
              }`}
            >
              Phổ  biến
            </button>
          </div>
        </div>

        <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 items-stretch">
          {filteredProducts.length > 0 ? (
            filteredProducts.slice(0, 4).map((p) => (
              <div key={p.id} className="h-full">
                <ProductCard key={p.id} p={p} onAdd={handleAddToCart} />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 md:py-12">
              <p className="text-brand-secondary text-sm md:text-base">Không tìm thấy sản phẩm nào trong danh mục này</p>
            </div>
          )}
        </div>

        {/* Nút Xem thêm - luôn hiển thị dưới phần sản phẩm */}
        <div className="mt-10 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Xem thêm
          </Link>
        </div>
      </section>

      {/* ===== TRUST & STATS SECTION ===== */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="stats-section-container relative rounded-2xl md:rounded-3xl overflow-hidden shadow-premium-lg">
          {/* Animated gradient background */}
          <div className="stats-gradient-bg absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent opacity-10" />

          <div className="stats-glass-panel relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 p-8 md:p-12">
            {/* Happy Customers */}
            <div className="stat-card text-center relative">
              <div className="stat-icon w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg">
                <MdPeople className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="stat-number text-2xl md:text-4xl font-bold mb-2">
                {stats.customers.toLocaleString()}+
              </div>
              <p className="stat-label text-brand-secondary font-medium text-xs md:text-sm">Đánh giá của khách hàng</p>
            </div>

            {/* Average Rating */}
            <div className="stat-card text-center relative">
              <div className="stat-icon w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <MdStar className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="stat-number text-2xl md:text-4xl font-bold mb-2">
                {stats.rating}★
              </div>
              <p className="stat-label text-brand-secondary font-medium text-xs md:text-sm">Đánh giá trung bình</p>
            </div>

            {/* AI Support */}
            <div className="stat-card text-center relative">
              <div className="stat-icon w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center shadow-lg">
                <BiSupport className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="stat-number text-2xl md:text-4xl font-bold mb-2">
                {stats.support}/7
              </div>
              <p className="stat-label text-brand-secondary font-medium text-xs md:text-sm">AI hỗ trợ</p>
            </div>

            {/* Free Shipping */}
            <div className="stat-card text-center relative">
              <div className="stat-icon w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <MdLocalShipping className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="stat-number text-2xl md:text-4xl font-bold mb-2">
                {stats.shipping}%
              </div>
              <p className="stat-label text-brand-secondary font-medium text-xs md:text-sm">Miễn phí vận chuyển</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CUSTOMER TESTIMONIALS ===== */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-dark mb-4 pb-1 leading-tight">
            Trải nghiệm của khách hàng
          </h2>
          <p className="text-brand-secondary text-base md:text-lg">
            Khách hàng nói gì về trải nghiệm của họ
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl md:rounded-2xl border border-brand-light p-4 md:p-6 shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-2"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light flex items-center justify-center overflow-hidden">
                    {review.user.avatar ? (
                      <Image
                        src={review.user.avatar}
                        alt={review.user.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-brand-primary font-bold text-base md:text-lg">
                        {review.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-brand-dark text-sm md:text-base">{review.user.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <MdStar
                          key={i}
                          className={`w-3 h-3 md:w-4 md:h-4 ${
                            i < review.rating ? "text-amber-400" : "text-brand-light"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <MdVerified className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                </div>

                {/* Review Content */}
                <p className="text-brand-secondary leading-relaxed mb-4 line-clamp-3 text-sm md:text-base">
                  {review.comment}
                </p>

                {/* Product Info */}
                {review.product && (
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-brand-light/50 hover:bg-brand-light transition-colors"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-white">
                      <Image
                        src={review.product.image}
                        alt={review.product.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-brand-dark truncate">
                        {review.product.name}
                      </p>
                      <p className="text-xs text-brand-secondary">
                        {review.createdAt}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 bg-brand-light/30 rounded-2xl">
            <MdStar className="w-12 h-12 md:w-16 md:h-16 text-brand-light mx-auto mb-4" />
            <p className="text-brand-secondary text-sm md:text-base">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!</p>
          </div>
        )}
      </section>

      {/* ===== BRAND STORY SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden shadow-premium-lg">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-secondary/20 to-brand-accent/20 animated-gradient" />
          
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Image Side */}
            <div className="relative h-[400px] md:h-[500px]">
              <Image
                src="/demo/about.png"
                alt="AIFShop Brand Story"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/80 md:to-white/60" />
            </div>

            {/* Content Side */}
            <div className="p-8 md:p-12">
              <div className="inline-block px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-sm mb-6">
                Câu chuyện của chúng tôi
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-6 pb-1 leading-tight">
                Nơi công nghệ AI gặp gỡ thời trang
              </h2>
              
              <p className="text-brand-secondary text-lg leading-relaxed mb-6">
                AIFShop ra đời từ niềm đam mê mang đến trải nghiệm mua sắm thời trang cá nhân hóa 
                và thông minh. Chúng tôi tin rằng công nghệ AI có thể giúp mỗi người tìm được 
                phong cách riêng của mình một cách dễ dàng và tự tin hơn.
              </p>
              
              <p className="text-brand-secondary leading-relaxed mb-8">
                Với đội ngũ chuyên gia thời trang và công nghệ, chúng tôi không ngừng cải tiến 
                để mang đến những sản phẩm chất lượng cao và dịch vụ hoàn hảo nhất.
              </p>
              
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Khám phá câu chuyện của chúng tôi
                <MdAutoAwesome className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing before footer */}
      <div className="h-12" />
    </main>
  );
}
