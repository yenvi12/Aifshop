"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { MdStar, MdLocalShipping, MdStraighten } from "react-icons/md";
import toast from "react-hot-toast";
import ProductCard, { type Product } from "@/components/ProductCard";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const transformed: Product[] = result.data.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              compareAtPrice: p.compareAtPrice || undefined,
              image: p.image || undefined,
              images: p.images || [],
              badge: p.badge || undefined,
              rating: p.rating || undefined,
            }));
            setProducts(transformed);
          }
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
        setProducts([
          { id: "1", slug: "desert-pearl-drops", name: "Desert Pearl Drops", price: 129, compareAtPrice: 159, image: "/demo/dc10.jpg", badge: "New", rating: 4.8 },
          { id: "2", slug: "scarfy-necklace", name: "Scarfy Necklace", price: 149, image: "/demo/dc3.jpg", rating: 4.5 },
          { id: "3", slug: "classic-leather-jacket-ear", name: "Classic Leather Jacket (Ear)", price: 99, compareAtPrice: 119, image: "/demo/ring1.jpg", badge: "Sale", rating: 4.7 },
        ]);
      } finally {
        setLoading(false);
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
    checkAuth();
  }, []);

  // Function to handle adding product to cart
  const handleAddToCart = async (product: Product) => {
    if (!user || !accessToken) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Product added to cart successfully!");
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

  if (loading) {
    return (
      <main className="min-h-screen" suppressHydrationWarning>
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  // mock reviews (có thể thay bằng dữ liệu thật từ API)
  const reviews = [
    { r: 5, t: "Love the quality. Will buy more!" },
    { r: 4, t: "Easy to style. Fits most occasions." },
    { r: 5, t: "Fast shipping and great price!" },
    { r: 4, t: "Nice packaging, item as described." },
    { r: 5, t: "Top-notch customer support." },
  ];

  return (
    <main className="min-h-screen" suppressHydrationWarning={true}>

      {/* ===== HERO ===== */}
      <section className="bg-brand-accent/20">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 grid md:grid-cols-[1fr_480px] gap-6 items-center">
          <div className="space-y-4">
            <div className="inline-block text-xs px-2 py-1 rounded-full bg-brand-light text-brand-primary">
              Fresh & curated
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark leading-snug">
              Discover the Latest Fashion Trends
            </h1>
            <p className="text-brand-secondary">
              Browse our collection of unique styles and find what suits you best.
            </p>
            <div className="flex gap-3">
              <Link href="/shop" className="rounded-xl px-4 py-2.5 bg-brand-primary text-white hover:opacity-90">
                Shop Now
              </Link>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-smooth border border-brand-light bg-white">
            <Image
              src="/demo/hero-jewelry.jpg"
              alt="Hero jewelry"
              width={900}
              height={700}
              className="w-full h-[260px] md:h-[300px] object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ===== FEATURED ===== */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-brand-dark">Featured Products</h2>
          <p className="text-sm text-brand-secondary">quick picks for you</p>
          <div className="mt-3 inline-block text-xs px-3 py-1 rounded-full bg-brand-accent text-brand-dark border border-brand-light">
            new & hot
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.slice(0, 3).map((p) => (
            <ProductCard key={p.id} p={p} onAdd={handleAddToCart} />
          ))}
        </div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.slice(3, 6).map((p) => (
            <ProductCard key={p.id} p={p} onAdd={handleAddToCart} />
          ))}
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-brand-light bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-brand-light">
            <div>
              <h3 className="font-semibold text-brand-dark">Customer Reviews</h3>
              <p className="text-sm text-brand-secondary">See what our customers are saying</p>
            </div>
            <button
              onClick={() => setShowAllReviews(true)}
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              See all
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 p-4">
            {reviews.slice(0, 3).map((rv, i) => (
              <div key={i} className="rounded-xl border border-brand-light p-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <MdStar key={j} className={`w-4 h-4 ${j < rv.r ? "" : "text-brand-light"}`} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-brand-dark">{rv.t}</p>
                <button className="mt-3 text-xs rounded-lg px-2 py-1 bg-brand-light/60 hover:bg-brand-light text-brand-dark border border-brand-light">
                  Read full review
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FASHION TIPS ===== */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-brand-light bg-white shadow-sm">
          <div className="p-4 border-b border-brand-light">
            <h3 className="font-semibold text-brand-dark">Fashion Tips</h3>
            <p className="text-sm text-brand-secondary">Get inspired with our fashion advice</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 p-4">
            <div className="rounded-xl border border-brand-light p-4 bg-brand-light/40">
              <h4 className="font-semibold text-brand-dark">Style Guide</h4>
              <p className="text-sm text-brand-secondary">
                Find your perfect fit — learn how to pair jewelry for any outfit.
              </p>
              <button className="mt-3 text-xs rounded-lg px-3 py-1.5 bg-white border border-brand-light text-brand-dark hover:bg-brand-light/60">
                Read more
              </button>
            </div>

            <div className="rounded-xl border border-brand-light p-4 bg-brand-light/40">
              <h4 className="font-semibold text-brand-dark">How to Style a Denim Jacket</h4>
              <p className="text-sm text-brand-secondary">
                Elevate your casual looks by combining denim with subtle jewelry.
              </p>
              <button className="mt-3 text-xs rounded-lg px-3 py-1.5 bg-white border border-brand-light text-brand-dark hover:bg-brand-light/60">
                Read more
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUICK LINKS ===== */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="rounded-2xl border border-brand-light bg-white shadow-sm p-4">
          <h3 className="font-semibold text-brand-dark mb-3">Quick Links</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-brand-light p-4 flex items-center gap-3">
              <MdStraighten className="w-7 h-7 text-brand-primary" />
              <div>
                <h4 className="font-semibold text-brand-dark">Size Guide</h4>
                <p className="text-sm text-brand-secondary">Find your perfect fit</p>
              </div>
            </div>
            <div className="rounded-xl border border-brand-light p-4 flex items-center gap-3">
              <MdLocalShipping className="w-7 h-7 text-brand-primary" />
              <div>
                <h4 className="font-semibold text-brand-dark">Shipping Policy</h4>
                <p className="text-sm text-brand-secondary">Learn about our shipping options</p>
              </div>
            </div>
            <div className="rounded-xl border border-brand-light p-4 flex items-center gap-3">
              <Image src="/demo/login.jpg" alt="Gift" width={56} height={56} className="w-14 h-14 object-cover rounded-lg" />
              <div>
                <h4 className="font-semibold text-brand-dark">Gift Ideas</h4>
                <p className="text-sm text-brand-secondary">Curated picks for someone special</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ===== SEE ALL REVIEWS MODAL ===== */}
      {showAllReviews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAllReviews(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-brand-light p-4">
            <div className="flex items-center justify-between border-b border-brand-light pb-3">
              <h3 className="font-semibold text-brand-dark">All Customer Reviews</h3>
              <button
                onClick={() => setShowAllReviews(false)}
                className="text-sm px-2 py-1 rounded-md border border-brand-light hover:bg-brand-light/60"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-brand-light">
              {reviews.map((rv, idx) => (
                <div key={idx} className="py-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <MdStar key={j} className={`w-4 h-4 ${j < rv.r ? "" : "text-brand-light"}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-brand-dark">{rv.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
