"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MdFilterList, MdSort, MdClose, MdRefresh } from "react-icons/md";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProductCard, { type Product } from "@/components/ProductCard";
import LoadingSpinner from "@/components/LoadingSpinner";

/** Reusable filter content so we can show it in both sidebar & mobile drawer */
function FilterContent() {
  return (
    <>
      {/* Search */}
      <div className="relative mb-5">
        <FaSearch className="absolute left-3 top-3 text-brand-secondary" />
        <input
          type="text"
          placeholder="Find items, brands"
          className="w-full pl-9 pr-3 py-2 border border-brand-light rounded-xl text-sm placeholder-brand-secondary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
      </div>

      <div className="space-y-5">
        {/* For */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-brand-primary">For</h4>
          <div className="flex flex-wrap gap-2">
            {["Women", "Men", "Kids"].map((t) => (
              <button
                key={t}
                className="px-3 py-1 border border-brand-light rounded-full text-xs hover:bg-brand-light/70"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-brand-primary">Material</h4>
          <div className="flex flex-wrap gap-2">
            {["Gold 14K", "Sterling Silver", "Platinum", "Diamond", "Pearl"].map((t) => (
              <button
                key={t}
                className="px-3 py-1 border border-brand-light rounded-full text-xs hover:bg-brand-light/70"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Fulfillment */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-brand-primary">Fulfillment</h4>
          <div className="flex flex-wrap gap-2">
            {["In stock", "Preorder", "Out of stock"].map((t) => (
              <button
                key={t}
                className="px-3 py-1 border border-brand-light rounded-full text-xs hover:bg-brand-light/70"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-brand-primary">Price range</h4>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              placeholder="Min"
              className="w-20 px-2 py-1 border border-brand-light rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <span className="text-brand-secondary text-xs">—</span>
            <input
              type="number"
              placeholder="Max"
              className="w-20 px-2 py-1 border border-brand-light rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-accent text-white font-semibold hover:opacity-90">
              <MdFilterList className="inline size-4 " /> Apply
            </button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-light hover:bg-brand-light/70">
              <MdRefresh className="inline size-4 " /> Reset
            </button>
          </div>
        </div>

        {/* Ask AI */}
        <div className="pt-4 border-t border-brand-light">
          <button className="w-full text-center border border-brand-primary/30 text-brand-primary rounded-xl py-2 text-sm font-medium hover:bg-brand-primary/5">
            Ask AI for help
          </button>
        </div>
      </div>
    </>
  );
}

export default function ProductListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // lock scroll when drawer open
  useEffect(() => {
    const el = document.documentElement; // better than body for mobile
    if (isFilterOpen) el.classList.add("overflow-hidden");
    else el.classList.remove("overflow-hidden");
    return () => el.classList.remove("overflow-hidden");
  }, [isFilterOpen]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsFilterOpen(false);
  }, []);
  useEffect(() => {
    if (isFilterOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFilterOpen, onKeyDown]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const result = await res.json();
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
              sizes: p.sizes || undefined,
            }));
            setProducts(transformed);
          }
        }
      } catch (error) {
        console.error('Fetch products error:', error);
        // fallback demo
        setProducts([
          { id: "1", slug: "navy-wool-blazer", name: "Silver Necklace", price: 180, image: "/demo/dc3.jpg", badge: "In stock" },
          { id: "2", slug: "leather-sneakers", name: "Sterling Silver Ring for daily", price: 200, image: "/demo/ring1", badge: "In stock" },
          { id: "3", slug: "straight-jeans", name: "S925 Necklace", price: 200, image: "/demo/dc10.jpg", badge: "Hot" },
          { id: "4", slug: "linen-shirt", name: "Flower Necklace", price: 180, image: "/demo/dc11.jpg", badge: "New" },
          { id: "5", slug: "cashmere-crew", name: "Sterling Silver Ring dainty cute daily", price: 120, image: "/demo/ring2.jpg", badge: "New" },
          { id: "6", slug: "classic-trench", name: "Four leaf lucky necklace", price: 210, image: "/demo/dc12.jpg", badge: "Sale" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    // Nếu sản phẩm có sizes, redirect đến trang chi tiết để chọn size
    if (product.sizes && product.sizes.length > 0) {
      if (product.slug) {
        router.push(`/products/${product.slug}`);
      } else {
        toast.error("Unable to view product details");
      }
      return;
    }

    try {
      // Kiểm tra authentication
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please login to add products to cart");
        router.push("/login");
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

      // Tìm sản phẩm trong giỏ hàng
      const existingItem = cartData.data?.find((item: any) => item.product.id === product.id);

      // Nếu sản phẩm đã tồn tại, tăng số lượng hiện tại lên 1
      // Nếu chưa tồn tại, thêm mới với số lượng 1
      const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

      // Gọi API cập nhật giỏ hàng
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: newQuantity
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
          router.push("/login");
        } else {
          toast.error(data.error || "Unable to add product to cart");
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error("An error occurred while adding the product to the cart");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-light/40 text-brand-dark">
      

      {/* Top actions on mobile */}
      <div className="md:hidden max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border border-brand-light rounded-lg text-sm flex items-center gap-1 hover:bg-brand-light/60">
            <MdSort className="text-brand-primary" /> Sort
          </button>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="px-3 py-2 border border-brand-light rounded-lg text-sm flex items-center gap-1 hover:bg-brand-light/60 bg-white"
            aria-haspopup="dialog"
            aria-expanded={isFilterOpen}
            aria-controls="mobile-filter-drawer"
          >
            <MdFilterList className="text-brand-primary" /> Filter
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10 md:grid md:grid-cols-[260px_1fr] md:gap-8">
        {/* ==== FILTER SIDEBAR (md+) ==== */}
        <aside
          className="
            hidden md:block
            bg-white border border-brand-light rounded-2xl p-5
            h-fit md:sticky md:top-20 md:z-10 shadow-smooth
          "
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <MdFilterList className="text-brand-primary" /> Filters
          </h2>
          <FilterContent />
        </aside>

        {/* ==== PRODUCT AREA ==== */}
        <section className="relative z-0 mt-4 md:mt-0">
          <div className=" md:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-brand-dark">All Products</h1>
              <p className="py-5 text-sm text-brand-secondary">
                Based on your browsing: Necklace, Pearl • Preferred: Minimal, Daily • Budget: $10–$200
              </p>
            </div>
            <div className="hidden md:flex gap-2">
              <button className="px-3 py-1.5 border border-brand-light rounded-lg text-sm flex items-center gap-1 hover:bg-brand-light/60">
                <MdSort className="text-brand-primary" /> Sort
              </button>
              <button className="px-3 py-1.5 border border-brand-light rounded-lg text-sm flex items-center gap-1 hover:bg-brand-light/60">
                <MdFilterList className="text-brand-primary" /> Filter
              </button>
              
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-brand-secondary text-sm">
              No products found.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => (
                <div key={p.id} className="relative z-0">
                  <ProductCard p={p} onAdd={handleAddToCart} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mt-10">
            <button className="p-2 border border-brand-light rounded-full hover:bg-brand-light/70">
              <FaChevronLeft className="text-brand-primary" />
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`px-3 py-1 border border-brand-light rounded-full text-sm ${
                  n === 1
                    ? "bg-brand-primary text-white"
                    : "hover:bg-brand-light/70 text-brand-dark"
                }`}
              >
                {n}
              </button>
            ))}
            <button className="p-2 border border-brand-light rounded-full hover:bg-brand-light/70">
              <FaChevronRight className="text-brand-primary" />
            </button>
          </div>
        </section>
      </div>

      {/* ==== MOBILE FILTER DRAWER ==== */}
      <div
        id="mobile-filter-drawer"
        role="dialog"
        aria-modal="true"
        className={`md:hidden fixed inset-0 z-[60] ${isFilterOpen ? "" : "pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${isFilterOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsFilterOpen(false)}
        />
        {/* Panel */}
        <div
          className={`
            absolute inset-y-0 left-0 w-[86%] max-w-[360px]
            bg-white border-r border-brand-light shadow-smooth
            transition-transform duration-300
            ${isFilterOpen ? "translate-x-0" : "-translate-x-full"}
            rounded-r-2xl
            flex flex-col
          `}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-brand-light">
            <h3 className="text-base font-semibold text-brand-dark flex items-center gap-2">
              <MdFilterList className="text-brand-primary" /> Filters
            </h3>
            <button
              aria-label="Close filters"
              className="p-2 rounded-lg hover:bg-brand-light/60 text-brand-primary"
              onClick={() => setIsFilterOpen(false)}
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="px-4 pt-4 pb-6 overflow-y-auto">
            <FilterContent />
          </div>
        </div>
      </div>
    </main>
  );
}
