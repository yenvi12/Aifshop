"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdStar, MdFavoriteBorder, MdFavorite, MdShoppingBag, MdAdd, MdRemove } from "react-icons/md";
import { type Product } from "./ProductCard";
import Header from "./Header";

type SizeOption = {
  name: string;
  stock: number;
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
    reviews?: Array<{
      id: string;
      name: string;
      rating: number;
      comment: string;
      date: string;
    }>;
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

  const images = [product.image, ...(product.images || [])].filter((img): img is string => Boolean(img && img.trim()));

  const sizes = product.sizes || [];
  const defaultSizes = sizes.length > 0 ? sizes : [{ name: "S", stock: 10 }, { name: "M", stock: 15 }, { name: "L", stock: 8 }];

  const discount =
    product.compareAtPrice && product.price && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
 const handleBuyNow = () => {
    // Nếu muốn truyền dữ liệu product, có thể lưu tạm vào localStorage / context
    router.push("/payment");
  };

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <span>Home</span>  <span>Products</span>  <span>Necklaces</span>
        </nav>

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
              <h3 className="font-semibold text-gray-900">Size</h3>
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
              <button className="flex-1 rounded-xl py-2.5 px-6  bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-light/90 disabled:opacity-60 transition">
                Add to cart
              </button>

              {/* Buy Now Button */}
              <button 
              onClick={handleBuyNow}
              className="flex-1 rounded-xl py-2.5 px-6  bg-brand-dark text-brand-light font-semibold border border-brand-light hover:bg-brand-primary/90 disabled:opacity-60 transition">
                Buy Now
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
              {product.reviews?.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="font-semibold">{review.name}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <MdStar
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 ml-2">{review.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))}
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
      </div>
    </>
  );
}