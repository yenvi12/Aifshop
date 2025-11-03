import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { type Product } from "@/components/ProductCard";

interface RawProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  images?: string[];
  badge?: string;
  rating?: number;
  overview?: string; // Tổng quan sản phẩm
  description?: string; // Mô tả chi tiết
  sizes?: string[];
}

// Fetch product from API
async function getProduct(slug: string) {
  try {
    // ✅ xác định base URL theo môi trường
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    // ✅ gọi API với URL đúng
    const response = await fetch(`${baseUrl}/api/products?slug=${slug}`, {
      cache: "no-store", // luôn lấy dữ liệu mới
    });
    const result = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    // Transform API data to match component interface
    const p = result.data;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice || undefined,
      image: p.image || undefined,
      images: p.images || [],
      badge: p.badge || undefined,
      rating: p.rating || undefined,
      overview: p.overview || undefined, // Tổng quan sản phẩm
      description: p.description || undefined, // Mô tả chi tiết
      features: ["High-quality materials", "Quality control"],
      sizes: p.sizes || [],
      reviews: [] // Will be fetched separately
    };
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

// Fetch reviews for a product
async function getProductReviews(productId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reviews?productId=${productId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return [];
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch product reviews:', error);
    return [];
  }
}

// Fetch related products
async function getRelatedProducts(currentProductId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return [];
    }

    // Get related products (excluding current product)
    return result.data
      .filter((p: RawProduct) => p.id !== currentProductId)
      .slice(0, 4)
      .map((p: RawProduct) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        compareAtPrice: p.compareAtPrice || undefined,
        image: p.image || undefined,
        badge: p.badge || undefined,
        rating: p.rating || undefined
      }));
  } catch (error) {
    console.error('Failed to fetch related products:', error);
    return [];
  }
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Get reviews for the product
  const reviews = await getProductReviews(product.id);

  // Get related products (excluding current product)
  const relatedProducts = await getRelatedProducts(product.id);

  // Include reviews in product data
  const productWithReviews = {
    ...product,
    reviews
  };

  return <ProductDetail product={productWithReviews} relatedProducts={relatedProducts} />;
}