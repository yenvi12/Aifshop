"use client";

import { useParams } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { type Product } from "@/components/ProductCard";

// Mock data - in real app this would come from API/database
const PRODUCTS: (Product & {
  description?: string;
  features?: string[];
  sizes?: string[];
  reviews?: Array<{
    id: string;
    name: string;
    rating: number;
    comment: string;
    date: string;
  }>;
})[] = [
  {
    id: "1",
    slug: "desert-pearl-drops",
    name: "Desert Pearl Drops",
    price: 129,
    compareAtPrice: 159,
    image: "/demo/dc10.jpg",
    badge: "New",
    rating: 4.8,
    description: "Beautiful pearl drop earrings perfect for any occasion. Crafted with high-quality materials and attention to detail.",
    features: ["High-quality pearls", "Sterling silver", "Quality control by JC"],
    sizes: ["42", "43", "44", "45"],
    reviews: [
      {
        id: "1",
        name: "Sarah Wilson",
        rating: 5,
        comment: "You did it so simple. My wife is so much easier and safer to work with than my old site. I just choose the page, make the changes.",
        date: "March 15, 2024"
      },
      {
        id: "2",
        name: "Jenny Wilson",
        rating: 4,
        comment: "You did it so simple. My wife is so much easier and safer to work with than my old site. I just choose the page, make the changes.",
        date: "January 26, 2024"
      },
      {
        id: "3",
        name: "Brooklyn Cooper",
        rating: 5,
        comment: "You did it so simple. My wife is so much easier and safer to work with than my old site. I just choose the page, make the changes.",
        date: "May 15, 2024"
      }
    ]
  },
  {
    id: "2",
    slug: "scarfy-necklace",
    name: "Scarfy Necklace",
    price: 149,
    image: "/demo/dc3.jpg",
    rating: 4.5,
    description: "Elegant scarf necklace that adds a touch of sophistication to any outfit.",
    features: ["Premium materials", "Adjustable length", "Perfect for layering"],
    sizes: ["42", "43", "44", "45"],
    reviews: [
      {
        id: "1",
        name: "Emma Davis",
        rating: 5,
        comment: "Absolutely love this necklace! The quality is outstanding.",
        date: "April 10, 2024"
      }
    ]
  },
  {
    id: "3",
    slug: "classic-leather-jacket-ear",
    name: "Classic Leather Jacket (Ear)",
    price: 99,
    compareAtPrice: 119,
    image: "/demo/ring1.jpg",
    badge: "Sale",
    rating: 4.7,
    description: "Classic leather jacket style earrings. Perfect for casual and formal wear.",
    features: ["Genuine leather", "Handcrafted", "Durable design"],
    sizes: ["42", "43", "44", "45"],
  },
  {
    id: "4",
    slug: "minimal-pearl-studs",
    name: "Minimal Pearl Studs",
    price: 89,
    image: "/demo/dc11.jpg",
    rating: 4.4,
    description: "Simple and elegant pearl stud earrings for everyday wear.",
    features: ["Freshwater pearls", "14k gold posts", "Hypoallergenic"],
    sizes: ["42", "43", "44", "45"],
  },
  {
    id: "5",
    slug: "layered-chain",
    name: "Layered Chain",
    price: 139,
    image: "/demo/dc12.jpg",
    rating: 4.6,
    description: "Multi-layered chain necklace perfect for creating depth in your jewelry collection.",
    features: ["Multiple chains", "Adjustable clasp", "Mixed metals"],
    sizes: ["42", "43", "44", "45"],
  },
  {
    id: "6",
    slug: "gemstone-pendant",
    name: "Gemstone Pendant",
    price: 169,
    image: "/demo/ring2.jpg",
    rating: 4.9,
    description: "Stunning gemstone pendant necklace featuring premium stones and craftsmanship.",
    features: ["Natural gemstones", "Sterling silver setting", "Includes chain"],
    sizes: ["42", "43", "44", "45"],
  },
];

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;

  const product = PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p>The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Get related products (excluding current product)
  const relatedProducts = PRODUCTS
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return <ProductDetail product={product} relatedProducts={relatedProducts} />;
}