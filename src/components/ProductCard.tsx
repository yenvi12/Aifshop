"use client";

import Image from "next/image";
import Link from "next/link";
import { MdFavoriteBorder, MdFavorite, MdShoppingBag, MdStar } from "react-icons/md";
import { useState } from "react";

export type Product = {
  id: string;
  slug?: string;
  name: string;
  price: number;          // giá hiện tại
  compareAtPrice?: number; // giá gốc (để hiển thị giảm)
  image: string;          // /public path or remote (if remote, configure next.config)
  badge?: "New" | "Hot" | "Sale" | string;
  rating?: number;        // 0..5
  colors?: string[];      // hex list
};

type Props = {
  p: Product;
  onAdd?: (p: Product) => void;
  onWish?: (p: Product, wished: boolean) => void;
  compact?: boolean;      // true = kiểu nhỏ gọn
};

export default function ProductCard({ p, onAdd, onWish, compact }: Props) {
  const [wished, setWished] = useState(false);
  const discount =
    p.compareAtPrice && p.compareAtPrice > p.price
      ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
      : 0;

  return (
    <div className={`group rounded-2xl border border-brand-light bg-white overflow-hidden transition
      ${compact ? "hover:shadow-md" : "hover:shadow-smooth"}`}>
      {/* Image */}
      <div className="relative">
        <Link href={p.slug ? `/products/${p.slug}` : "#"} className="block">
          <Image
            src={p.image}
            alt={p.name}
            width={600}
            height={600}
            className={`w-full ${compact ? "h-48" : "h-56"} object-cover`}
            priority={false}
          />
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          {p.badge && (
            <span className="text-xs px-2 py-1 rounded-full bg-brand-primary/90 text-white shadow-sm">
              {p.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-brand-accent text-brand-dark border border-brand-light">
              -{discount}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          aria-label="wishlist"
          onClick={() => {
            const val = !wished;
            setWished(val);
            onWish?.(p, val);
          }}
          className="absolute right-3 top-3 p-2 rounded-full bg-white/95 text-brand-primary shadow-sm
                     hover:scale-105 transition"
        >
          {wished ? <MdFavorite className="w-5 h-5" /> : <MdFavoriteBorder className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <Link
          href={p.slug ? `/products/${p.slug}` : "#"}
          className="font-medium text-brand-dark line-clamp-1 hover:text-brand-primary"
          title={p.name}
        >
          {p.name}
        </Link>

        {/* Rating */}
        {typeof p.rating === "number" && (
          <div className="mt-1 flex items-center gap-1 text-brand-secondary">
            {Array.from({ length: 5 }).map((_, i) => (
              <MdStar key={i} className={`w-4 h-4 ${i < Math.round(p.rating!) ? "text-amber-400" : "text-brand-light"}`} />
            ))}
            <span className="text-xs ml-1">{p.rating!.toFixed(1)}</span>
          </div>
        )}

        {/* Colors */}
        {p.colors?.length ? (
          <div className="mt-2 flex items-center gap-1.5">
            {p.colors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="w-4 h-4 rounded-full border border-black/5"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            {p.colors.length > 4 && (
              <span className="text-xs text-brand-secondary">+{p.colors.length - 4}</span>
            )}
          </div>
        ) : null}

        {/* Price + Add */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-brand-dark font-semibold">${p.price.toFixed(2)}</span>
            {p.compareAtPrice && p.compareAtPrice > p.price && (
              <span className="text-sm text-brand-secondary line-through">
                ${p.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={() => onAdd?.(p)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5
                       bg-brand-accent text-brand-dark border border-brand-light
                       hover:bg-brand-accent/90 transition"
          >
            <MdShoppingBag className="w-4 h-4" />
            <span className="text-sm font-semibold">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
