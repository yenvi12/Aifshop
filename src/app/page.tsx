"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MdStar, MdLocalShipping, MdStraighten } from "react-icons/md";import ProductCard, { type Product } from "@/components/ProductCard";
import Header from "@/components/Header";
const PRODUCTS: Product[] = [
  { id: "1", name: "Desert Pearl Drops", price: 129, compareAtPrice: 159, image: "/demo/dc10.jpg", badge: "New", rating: 4.8 },
  { id: "2", name: "Scarfy Necklace", price: 149, image: "/demo/dc3.jpg", rating: 4.5 },
  { id: "3", name: "Classic Leather Jacket (Ear)", price: 99, compareAtPrice: 119, image: "/demo/ring1.jpg", badge: "Sale", rating: 4.7 },
  { id: "4", name: "Minimal Pearl Studs", price: 89, image: "/demo/dc11.jpg", rating: 4.4 },
  { id: "5", name: "Layered Chain", price: 139, image: "/demo/dc12.jpg", rating: 4.6 },
  { id: "6", name: "Gemstone Pendant", price: 169, image: "/demo/ring2.jpg", rating: 4.9 },
];

export default function HomePage() {
  const [q, setQ] = useState("");

  return (
    <main className="min-h-screen">
      <Header></Header>
      {/* ===== HERO ===== */}
      <section className="bg-brand-accent/20">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 grid md:grid-cols-[1fr_480px] gap-6 items-center">
          {/* left copy */}
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
              <Link
                href="/shop"
                className="rounded-xl px-4 py-2.5 bg-brand-primary text-white hover:opacity-90"
              >
                Shop Now
              </Link>
              <Link
                href="/about"
                className="rounded-xl px-4 py-2.5 bg-white border border-brand-light text-brand-dark hover:bg-brand-light/50"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* right image */}
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
          {PRODUCTS.slice(0, 3).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {/* row 2 (nếu muốn nhiều hơn) */}
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.slice(3, 6).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-brand-light bg-white shadow-sm">
          <div className="p-4 border-b border-brand-light">
            <h3 className="font-semibold text-brand-dark">Customer Reviews</h3>
            <p className="text-sm text-brand-secondary">See what our customers are saying</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 p-4">
            {[
              { t: "Love the quality. Will buy more!", r: 5 },
              { t: "Easy to style. Fits most occasions.", r: 4 },
              { t: "Fast shipping and great price!", r: 5 },
            ].map((rv, i) => (
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
              <Image src="/login-model.jpg" alt="Gift" width={56} height={56} className="w-14 h-14 object-cover rounded-lg" />
              <div>
                <h4 className="font-semibold text-brand-dark">Gift Ideas</h4>
                <p className="text-sm text-brand-secondary">Curated picks for someone special</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER BAR ===== */}
      <footer className="bg-brand-light border-t border-brand-accent">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-brand-secondary flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} AIFShop. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-brand-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-brand-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
