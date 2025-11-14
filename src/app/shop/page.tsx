"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaChevronLeft, FaChevronRight, FaSort, FaFilter } from "react-icons/fa";
import ProductCard, { type Product } from "@/components/ProductCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { addGuestCartItem } from "@/lib/guestCart";

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
  category?: string;
}

interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  size: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    price: number | null;
    compareAtPrice: number | null;
    image: string | null;
    images: string[];
    stock: number;
    sizes: { name: string; stock: number }[] | null;
    badge: string | null;
    slug: string;
  };
}


export default function ProductListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<string>('default');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;
  
  // Danh sách categories từ add-product page
  const categories = [
    'Necklaces',
    'Earrings',
    'Bracelets',
    'Rings',
    'Jewelry Sets',
    'Other'
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch with pagination params to get all products
        const res = await fetch("/api/products?limit=100&page=1");
        if (res.ok) {
          const result = await res.json();
          console.log('📦 Raw API response:', result);
          
          if (result.success && result.data) {
            // Log giá trị price gốc và category từ API trước khi transform
            console.log('💰 Original data from API:', result.data.map((p: ApiProduct) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              originalPrice: p.price,
              salePrice: p.compareAtPrice,
              hasValidPrice: p.price !== null && p.price !== undefined && p.price > 0,
              willUseSalePrice: !p.price || p.price === 0
            })));
            
            const transformed: Product[] = result.data.map((p: ApiProduct) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  price: p.price !== null && p.price !== undefined && p.price > 0 ? Number(p.price) : (p.compareAtPrice ? Number(p.compareAtPrice) : 0),
  compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
  image: p.image || undefined,
  images: p.images || [],
  badge: p.badge || undefined,
  rating: p.rating || undefined,
  sizes: p.sizes || undefined,
  category: p.category, // Thêm category field
}));
            
            // Log kiểm tra sản phẩm sau khi transform
            console.log('🛍️ Fetched and transformed products:', {
              originalCount: result.data?.length || 0,
              transformedCount: transformed.length,
              priceLogic: 'Use original price if > 0, otherwise use compareAtPrice (Sale price)',
              products: transformed.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                finalPrice: p.price,
                hasCompareAtPrice: !!p.compareAtPrice,
                image: p.image,
                badge: p.badge
              }))
            });
            
            setProducts(transformed);
          }
        }
      } catch (error) {
        console.error('Fetch products error:', error);
        // fallback demo
        setProducts([
          { id: "1", slug: "navy-wool-blazer", name: "Silver Necklace", price: 180, image: "/demo/dc3.jpg", badge: "In stock", category: "Necklaces" },
          { id: "2", slug: "leather-sneakers", name: "Sterling Silver Ring for daily", price: 200, image: "/demo/ring1", badge: "In stock", category: "Rings" },
          { id: "3", slug: "straight-jeans", name: "S925 Necklace", price: 200, image: "/demo/dc10.jpg", badge: "Hot", category: "Necklaces" },
          { id: "4", slug: "linen-shirt", name: "Flower Necklace", price: 180, image: "/demo/dc11.jpg", badge: "New", category: "Necklaces" },
          { id: "5", slug: "cashmere-crew", name: "Sterling Silver Ring dainty cute daily", price: 120, image: "/demo/ring2.jpg", badge: "New", category: "Rings" },
          { id: "6", slug: "classic-trench", name: "Four leaf lucky necklace", price: 210, image: "/demo/dc12.jpg", badge: "Sale", category: "Necklaces" },
          { id: "7", slug: "demo-product-7", name: "Pearl Earrings", price: 150, image: "/demo/giay.jpg", badge: "New", category: "Earrings" },
          { id: "8", slug: "demo-product-8", name: "Gold Bracelet", price: 250, image: "/demo/vi.jpg", badge: "Hot", category: "Bracelets" },
          { id: "9", slug: "demo-product-9", name: "Crystal Pendant", price: 180, image: "/demo/ý.jpg", badge: "Sale", category: "Necklaces" },
          { id: "10", slug: "demo-product-10", name: "Diamond Ring", price: 500, image: "/demo/dan-tri-0603awo-pr07-1-crop-1709803508993.webp", badge: "Best Seller", category: "Rings" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Reset page to 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, sortOption]);

  // Đóng dropdown khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
      if (!target.closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lọc và sắp xếp sản phẩm
  const filteredAndSortedProducts = products
    .filter(product => {
      if (filterCategory === 'all') return true;
      
      // Logic lọc theo category - sử dụng trường category nếu có
      if (product.category) {
        return product.category === filterCategory;
      }
      
      // Fallback: tìm trong tên sản phẩm nếu không có category
      const productName = product.name.toLowerCase();
      switch (filterCategory) {
        case 'Necklaces':
          return productName.includes('necklace');
        case 'Earrings':
          return productName.includes('earring');
        case 'Bracelets':
          return productName.includes('bracelet');
        case 'Rings':
          return productName.includes('ring');
        case 'Jewelry Sets':
          return productName.includes('set');
        default:
          return false;
      }
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0; // Default order
      }
    });

  // Pagination logic
  const totalProducts = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - half);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of products section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

    // Guest: thêm vào guest cart, không ép đăng nhập
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      addGuestCartItem({ productId: product.id, quantity: 1 });
      toast.success("Đã thêm sản phẩm vào giỏ hàng");
      return;
    }

    // Logged-in: gọi thẳng API /api/cart (upsert)
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Sản phẩm đã được thêm vào giỏ hàng!");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          router.push("/login");
        } else {
          toast.error(data.error || "Unable to add product to cart");
        }
      }
    } catch (error) {
      console.error("Add to cart error:", error);
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
    <main className="min-h-screen text-brand-dark">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        {/* ==== PRODUCT AREA ==== */}
        <section className="relative z-0">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-brand-dark">All Products</h1>
                <p className="py-5 text-sm text-brand-secondary">
                  Based on your browsing: Necklace, Pearl • Preferred: Minimal, Daily • Budget: 100.000₫ - 300.000₫
                </p>
              </div>
              
              {/* Nút Sort và Filter */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Nút Sort */}
                <div className="relative sort-dropdown">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-brand-light rounded-lg hover:bg-brand-light/50 min-h-[44px] min-w-[44px] sm:min-w-0"
                    aria-label="Sort products"
                  >
                    <FaSort className="text-brand-primary" size={14} />
                    <span className="text-sm font-medium hidden sm:inline">Sort</span>
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-light rounded-lg shadow-lg z-10">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setSortOption('default');
                            setShowSortDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                        >
                          Mặc định
                        </button>
                        <button
                          onClick={() => {
                            setSortOption('price-low');
                            setShowSortDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                        >
                          Giá: Thấp đến Cao
                        </button>
                        <button
                          onClick={() => {
                            setSortOption('price-high');
                            setShowSortDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                        >
                          Giá: Cao đến Thấp
                        </button>
                        <button
                          onClick={() => {
                            setSortOption('name');
                            setShowSortDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                        >
                          Tên: A đến Z
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nút Filter */}
                <div className="relative filter-dropdown">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-brand-light rounded-lg hover:bg-brand-light/50 min-h-[44px] min-w-[44px] sm:min-w-0"
                    aria-label="Filter products"
                  >
                    <FaFilter className="text-brand-primary" size={14} />
                    <span className="text-sm font-medium hidden sm:inline">Filter</span>
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-light rounded-lg shadow-lg z-10">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setFilterCategory('all');
                            setShowFilterDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                        >
                          All Categories
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              setFilterCategory(category);
                              setShowFilterDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-brand-light/30 text-sm"
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {currentProducts.length === 0 ? (
            <div className="text-center py-20 text-brand-secondary text-sm">
              {filterCategory === 'all' ? (
                'Không tìm thấy sản phẩm.'
              ) : (
                `Chúng tôi chưa có sản phẩm nào thuộc "${filterCategory}".`
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
                {currentProducts.map((p) => (
                  <div key={p.id} className="relative z-0 h-full">
                    <ProductCard p={p} onAdd={handleAddToCart} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 border border-brand-light rounded-full ${
                      currentPage === 1
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-brand-light/70'
                    }`}
                  >
                    <FaChevronLeft className="text-brand-primary" />
                  </button>
                  
                  {/* Page Numbers */}
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 border border-brand-light rounded-full text-sm ${
                        currentPage === pageNum
                          ? "bg-brand-primary text-white"
                          : "hover:bg-brand-light/70 text-brand-dark"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 border border-brand-light rounded-full ${
                      currentPage === totalPages
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-brand-light/70'
                    }`}
                  >
                    <FaChevronRight className="text-brand-primary" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
