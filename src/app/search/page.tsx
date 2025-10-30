"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MdFilterList, MdSort, MdClose } from "react-icons/md";
import ProductCard, { type Product } from "@/components/ProductCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EnhancedSearchBar from "@/components/search/EnhancedSearchBar";
import SearchFiltersComponent, { type SearchFilters } from "@/components/search/SearchFilters";
import ViewToggle from "@/components/search/ViewToggle";
import EnhancedEmptyState from "@/components/search/EnhancedEmptyState";
import toast from "react-hot-toast";

interface ApiProduct {
  id: string;
  slug?: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  image: string | null;
  images: string[];
  badge: string | null;
  rating: number | null;
  sizes: { name: string; stock: number }[] | null;
  description?: string;
  category?: string; // Add category field
  createdAt?: string; // Add createdAt field
}

interface CartItem {
  product: { id: string };
  quantity: number;
}

function SearchContent() {
  // Helper function to get final price for sorting (consistent with ProductCard logic)
  const getFinalPrice = (product: Product): number => {
    if (product.price && product.price > 0) {
      return product.price;
    }
    if (product.compareAtPrice && product.compareAtPrice > 0) {
      return product.compareAtPrice;
    }
    return 0; // Handle case where both are null/0
  };

  // Helper function to get timestamp for newest sorting
  const getCreatedAtTimestamp = (product: Product): number => {
    if (product.createdAt) {
      return new Date(product.createdAt).getTime();
    }
    return 0; // Handle case where createdAt is missing
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"relevance" | "category-asc" | "category-desc" | "price-asc" | "price-desc" | "rating" | "newest">("relevance");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    category: [],
    priceRange: [0, 1000000],
    rating: 0,
    inStock: false
  });

  // Lock scroll when filter drawer is open
  useEffect(() => {
    const el = document.documentElement;
    if (isFilterOpen) el.classList.add("overflow-hidden");
    else el.classList.remove("overflow-hidden");
    return () => el.classList.remove("overflow-hidden");
  }, [isFilterOpen]);

  // Handle escape key for filter drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFilterOpen(false);
    };
    
    if (isFilterOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isFilterOpen]);

  useEffect(() => {
    // Check authentication
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

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=50`);
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
              description: p.description,
              category: p.category,
              createdAt: p.createdAt,
            }));
            setProducts(transformed);
          } else {
            setProducts([]);
          }
        } else {
          toast.error("Không thể tải kết quả tìm kiếm");
          setProducts([]);
        }
      } catch (e) {
        console.error("Failed to fetch search results:", e);
        toast.error("Đã xảy ra lỗi khi tìm kiếm");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products];

    // Apply category filter - FIXED: Use actual category field
    if (filters.category.length > 0) {
      filtered = filtered.filter(product =>
        filters.category.some(category =>
          product.category?.toLowerCase() === category.toLowerCase() ||
          product.category?.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Apply price filter - FIXED: Use final price (price vs compareAtPrice)
    filtered = filtered.filter(product => {
      const finalPrice = getFinalPrice(product);
      if (finalPrice === 0) return true; // Include products with no price info
      return finalPrice >= filters.priceRange[0] && finalPrice <= filters.priceRange[1];
    });

    // Apply rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(product => (product.rating || 0) >= filters.rating);
    }

    // Apply stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => !product.sizes || product.sizes.length === 0 || product.sizes.some(size => size.stock > 0));
    }

    // Brand filter removed as requested

    // Apply sorting
    switch (sortBy) {
      case "category-asc":
        filtered.sort((a, b) => {
          const aCategory = (a.category || "").toLowerCase();
          const bCategory = (b.category || "").toLowerCase();
          return aCategory.localeCompare(bCategory);
        });
        break;
      case "category-desc":
        filtered.sort((a, b) => {
          const aCategory = (a.category || "").toLowerCase();
          const bCategory = (b.category || "").toLowerCase();
          return bCategory.localeCompare(aCategory);
        });
        break;
      case "price-asc":
        filtered.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
        break;
      case "price-desc":
        filtered.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        // Sort by createdAt timestamp - newest first
        filtered.sort((a, b) => {
          const aTimestamp = getCreatedAtTimestamp(a);
          const bTimestamp = getCreatedAtTimestamp(b);
          return bTimestamp - aTimestamp;
        });
        break;
      default:
        // relevance - keep original order
        break;
    }

    setFilteredProducts(filtered);
  }, [products, filters, sortBy]);

  const handleAddToCart = async (product: Product) => {
    if (product.sizes && product.sizes.length > 0) {
      if (product.slug) {
        router.push(`/products/${product.slug}`);
      } else {
        toast.error("Unable to view product details");
      }
      return;
    }

    if (!user || !accessToken) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    try {
      const cartResponse = await fetch("/api/cart", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const cartData = await cartResponse.json();

      if (!cartData.success) {
        toast.error("Không thể lấy thông tin giỏ hàng");
        return;
      }

      const existingItem = cartData.data?.find(
        (item: CartItem) => item.product.id === product.id
      );
      const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: newQuantity,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Đã thêm sản phẩm vào giỏ hàng!");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        if (response.status === 401) {
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          setUser(null);
          setAccessToken(null);
        } else {
          toast.error(result.error || "Không thể thêm sản phẩm vào giỏ hàng");
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng");
    }
  };

  const handleSearch = (searchQuery: string) => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const clearSearch = () => {
    router.push("/search");
  };

  const handleNewSearch = () => {
    clearSearch();
    // Focus the search input after navigation
    setTimeout(() => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    }, 100);
  };

  const sortOptions = [
    { value: "relevance", label: "Độ liên quan" },
    { value: "category-asc", label: "Danh mục A-Z" },
    { value: "category-desc", label: "Danh mục Z-A" },
    { value: "price-asc", label: "Giá thấp đến cao" },
    { value: "price-desc", label: "Giá cao đến thấp" },
    { value: "rating", label: "Đánh giá cao nhất" },
    { value: "newest", label: "Mới nhất" }
  ];

  return (
    <main className="min-h-screen pb-12">
      {/* Search Header */}
      <div className="bg-gradient-to-b from-brand-light/50 to-white border-b border-brand-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-2">
                {hasSearched ? "Kết quả tìm kiếm" : "Tìm kiếm sản phẩm"}
              </h1>
              {query && (
                <p className="text-brand-secondary flex items-center justify-center gap-2 flex-wrap">
                  <span>Kết quả cho:</span>
                  <span className="font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full">
                    {query}
                  </span>
                  <button
                    onClick={clearSearch}
                    className="ml-2 p-1 rounded-full hover:bg-brand-light transition-colors"
                    aria-label="Clear search"
                  >
                    <MdClose className="w-4 h-4" />
                  </button>
                </p>
              )}
            </div>

            {/* Enhanced Search Bar */}
            <div className="w-full max-w-3xl">
              <EnhancedSearchBar
                onSearch={handleSearch}
                initialValue={query}
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                showSuggestions={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        ) : hasSearched ? (
          filteredProducts.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <p className="text-brand-secondary">
                    Tìm thấy <span className="font-semibold text-brand-primary">{filteredProducts.length}</span>{" "}
                    {filteredProducts.length === 1 ? "sản phẩm" : "sản phẩm"}
                    {query && (
                      <span className="ml-1">cho &ldquo;{query}&ldquo;</span>
                    )}
                  </p>
                  
                  {/* Active Filters Count */}
                  {(filters.category.length > 0 || filters.rating > 0 || filters.inStock ||
                    filters.priceRange[0] > 0 || filters.priceRange[1] < 1000000) && (
                    <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full">
                      Đã lọc
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-brand-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* View Toggle */}
                  <ViewToggle view={view} onViewChange={setView} />

                  {/* Filter Toggle (Mobile) */}
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="md:hidden px-3 py-2 border border-brand-light rounded-lg text-sm flex items-center gap-1 hover:bg-brand-light/60"
                    aria-haspopup="dialog"
                    aria-expanded={isFilterOpen}
                  >
                    <MdFilterList className="text-brand-primary" />
                    Filters
                  </button>
                </div>
              </div>

              <div className="md:grid md:grid-cols-[280px_1fr] md:gap-8">
                {/* Filters Sidebar */}
                <SearchFiltersComponent
                  filters={filters}
                  onFiltersChange={setFilters}
                  isOpen={isFilterOpen}
                  onClose={() => setIsFilterOpen(false)}
                />

                {/* Products Grid/List */}
                <div className="mt-4 md:mt-0">
                  {view === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
                      {filteredProducts.map((p) => (
                        <div key={p.id} className="h-full">
                          <ProductCard p={p} onAdd={handleAddToCart} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredProducts.map((p) => (
                        <div key={p.id} className="bg-white border border-brand-light rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex gap-4">
                            <div className="w-24 h-24 flex-shrink-0">
                              <img
                                src={p.image || "/demo/dc10.jpg"}
                                alt={p.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-brand-dark mb-1">{p.name}</h3>
                              {p.description && (
                                <p className="text-sm text-brand-secondary mb-2 line-clamp-2">{p.description}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-brand-primary">
                                  {(() => {
                                    if (p.price && p.price > 0) {
                                      return `${p.price.toLocaleString("vi-VN")}₫`;
                                    }
                                    if (p.compareAtPrice && p.compareAtPrice > 0) {
                                      return `${p.compareAtPrice.toLocaleString("vi-VN")}₫`;
                                    }
                                    return "Liên hệ";
                                  })()}
                                </span>
                                <button
                                  onClick={() => handleAddToCart(p)}
                                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-dark transition-colors"
                                >
                                  Thêm vào giỏ
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EnhancedEmptyState
              query={query}
              hasSearched={hasSearched}
              onNewSearch={handleNewSearch}
            />
          )
        ) : (
          <EnhancedEmptyState
            hasSearched={hasSearched}
            onNewSearch={handleNewSearch}
          />
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
