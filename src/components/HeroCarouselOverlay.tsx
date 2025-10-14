// HeroCarouselOverlay.tsx
"use client";

import { JSX, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Position = "left" | "center" | "right";
type CTA = { label: string; href: string };

// Cho phép dùng img hoặc src
type SlideInput =
  | { title: string; caption?: string; cta?: CTA; position?: Position; img: string; src?: never }
  | { title: string; caption?: string; cta?: CTA; position?: Position; src: string; img?: never };

type Props = {
  slides?: SlideInput[];
  interval?: number;      // ms, mặc định 3000
  className?: string;     // tiện padding/margin từ bên ngoài
};

const DEFAULT_INTERVAL = 3000;

const defaultSlides: SlideInput[] = [
  {
    title: "Discover the Latest Fashion Trends",
    caption: "Browse unique styles and find what suits you best.",
    cta: { label: "Shop Now", href: "#" },
    img: "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=1600&auto=format&fit=crop",
    position: "left",
  },
  {
    title: "Minimal Jewelry, Maximum Impact",
    caption: "Handpicked pieces with timeless charm.",
    cta: { label: "Explore", href: "#" },
    img: "https://images.unsplash.com/photo-1610420612786-0f6b5d9d1ab7?q=80&w=1600&auto=format&fit=crop",
    position: "center",
  },
  {
    title: "New Season Arrivals",
    caption: "Fresh colors and breathable fabrics.",
    cta: { label: "View Collection", href: "#" },
    img: "https://images.unsplash.com/photo-1520975693412-634c4a60f6f5?q=80&w=1600&auto=format&fit=crop",
    position: "right",
  },
];

export default function HeroCarouselOverlay({
  slides = defaultSlides,
  interval = DEFAULT_INTERVAL,
  className = "",
}: Props): JSX.Element {
  const [index, setIndex] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pausedRef = useRef<boolean>(false);

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const goTo = (i: number) => setIndex(i);

  useEffect(() => {
    if (pausedRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, interval]);

  const onPause = (v: boolean) => {
    pausedRef.current = v;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <section className={`w-full select-none ${className}`}>
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
        onMouseEnter={() => onPause(true)}
        onMouseLeave={() => onPause(false)}
        onFocusCapture={() => onPause(true)}
        onBlurCapture={() => onPause(false)}
      >
        {/* Slide track */}
        <div className="relative h-[520px] md:h-[420px]">
          {slides.map((s, i) => (
            <SlideItem key={i} slide={s} active={i === index} />
          ))}
        </div>

        {/* Controls */}
        <button
          aria-label="Previous slide"
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/70 text-slate-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Next slide"
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/70 text-slate-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dots */}
        <div className="pointer-events-auto absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${
                index === i ? "w-6 bg-brand-primary" : "w-2.5 bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SlideItem({
  slide,
  active,
}: {
  slide: SlideInput;
  active: boolean;
}): JSX.Element {
  const align =
    slide.position === "left"
      ? "items-start text-left"
      : slide.position === "right"
      ? "items-end text-right"
      : "items-center text-center";

  const src = "img" in slide ? slide.img : slide.src;

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity duration-700 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <img
        src={src}
        alt={slide.title}
        className="h-full w-full object-cover"
        draggable={false}
      />
      {/* overlay giúp chữ dễ đọc */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      <div
        className={`absolute inset-0 flex ${align} justify-center p-6 md:p-12`}
        aria-live="polite"
      >
        <div className="max-w-xl space-y-4 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide">
            Fresh & curated
          </span>
          <h1 className="text-3xl font-extrabold md:text-5xl">{slide.title}</h1>
          {"caption" in slide && slide.caption && (
            <p className="text-base/relaxed md:text-lg/relaxed text-white/90">
              {slide.caption}
            </p>
          )}
          {"cta" in slide && slide.cta && (
            <a
              href={slide.cta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              {slide.cta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
