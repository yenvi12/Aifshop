import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { type Product } from "@/components/ProductCard";

// Fetch product from API
async function getProduct(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products?slug=${slug}`, {
      cache: 'no-store' // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

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
      description: p.description || "Beautiful piece of jewelry crafted with attention to detail.",
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
      .filter((p: any) => p.id !== currentProductId)
      .slice(0, 4)
      .map((p: any) => ({
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
  params: {
    slug: string;
  };
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