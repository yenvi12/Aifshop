"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MdFavoriteBorder,
  MdFavorite,
  MdShoppingBag,
  MdStar,
  MdSmartToy,
} from "react-icons/md";
import { useState } from "react";

export type Product = {
  id: string;
  slug?: string;
  name: string;
  price: number | null;
  compareAtPrice?: number | null;
  image?: string;
  images?: string[];
  badge?: "New" | "Hot" | "Sale" | string;
  rating?: number;
  colors?: string[];
  sizes?: { name: string; stock: number }[];
  description?: string; // 👈 thêm mô tả sản phẩm
};

type Props = {
  p: Product;
  onAdd?: (p: Product) => void;
  onWish?: (p: Product, wished: boolean) => void;
  compact?: boolean;
};

export default function ProductCard({ p, onAdd, onWish, compact }: Props) {
  const [wished, setWished] = useState(false);
  const discount =
    p.compareAtPrice && p.price && p.compareAtPrice > p.price
      ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
      : 0;

  return (
    <div
      className={`group rounded-2xl border border-brand-light bg-white overflow-hidden transition
      ${compact ? "hover:shadow-md" : "hover:shadow-smooth"} hover:-translate-y-[2px]`}
    >
      {/* Image */}
      <div className="relative">
        <Link href={p.slug ? `/products/${p.slug}` : "#"} className="block">
          <div className={`relative w-full ${compact ? "h-48" : "h-56"}`}>
            <Image
              src={p.image || "/demo/dc10.jpg"}
              alt={p.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              priority={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          {p.badge && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-brand-primary/90 text-white shadow-sm backdrop-blur">
              {p.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-white/90 text-brand-dark border border-brand-light shadow-sm">
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
          className="absolute right-3 top-3 p-2 rounded-full bg-white text-brand-primary shadow-sm
                     hover:scale-105 transition"
        >
          {wished ? <MdFavorite className="w-5 h-5" /> : <MdFavoriteBorder className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tên sản phẩm */}
        <Link
          href={p.slug ? `/products/${p.slug}` : "#"}
          className="text-[15px] md:text-base font-semibold text-brand-dark leading-snug tracking-tight line-clamp-1 hover:text-brand-primary transition-colors"
          title={p.name}
        >
          {p.name}
        </Link>

        {/* Mô tả nhỏ có dấu … nếu quá dài */}
        {p.description && (
          <p className="mt-1 text-sm text-brand-secondary leading-snug line-clamp-2">
            {p.description}
          </p>
        )}

        {/* Rating */}
        {typeof p.rating === "number" && (
          <div className="mt-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <MdStar
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(p.rating!) ? "text-amber-400" : "text-brand-light"
                }`}
              />
            ))}
            <span className="text-xs text-brand-secondary ml-1">{p.rating!.toFixed(1)}</span>
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

        {/* Price + Buttons */}
        <div className="mt-3 flex items-center justify-between">
          {/* Cụm giá */}
          <div className="flex flex-col justify-center items-start leading-tight">
            {/* Giá gốc (trên) */}
            {p.compareAtPrice && p.price && p.compareAtPrice > p.price && (
              <span className="tabular-nums text-sm md:text-[13px] text-brand-secondary line-through mb-[2px]">
                {p.compareAtPrice.toLocaleString("vi-VN")}₫
              </span>
            )}
          
            {/* Giá hiện tại (dưới, in đậm) */}
            <span className="tabular-nums tracking-tight text-brand-dark font-bold text-lg md:text-xl leading-none">
              {p.price ? `${p.price.toLocaleString("vi-VN")}₫` : "Price TBA"}
            </span>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-2">
            

            {/* Add */}
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
    </div>
  );
}
