// HeroCarouselOverlay.tsx
"use client";

import { JSX, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Position = "left" | "center" | "right";
type CTA = { label: string; href: string };

type SlideInput =
  | { title: string; caption?: string; cta?: CTA; position?: Position; img: string; src?: never }
  | { title: string; caption?: string; cta?: CTA; position?: Position; src: string; img?: never };

type Props = {
  slides?: SlideInput[];
  interval?: number;      // ms
  className?: string;
  pauseOnHover?: boolean; // mặc định false => không pause
};

const DEFAULT_INTERVAL = 2000;

const defaultSlides: SlideInput[] = [/* giữ như bạn đang có */];

export default function HeroCarouselOverlay({
  slides = defaultSlides,
  interval = DEFAULT_INTERVAL,
  className = "",
  pauseOnHover = false,
}: Props): JSX.Element {
  const [index, setIndex] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pausedRef = useRef<boolean>(false);

  // ---- helpers: start/stop/kick autoplay ----
  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = undefined;
  };
  const start = () => {
    stop();
    pausedRef.current = false;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
  };
  const kick = () => {
    // gọi sau mọi tương tác để đảm bảo tiếp tục chạy
    start();
  };

  // mount + khi index/interval đổi -> giữ autoplay
  useEffect(() => {
    if (!pausedRef.current) start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, interval, slides.length]);

  // điều hướng
  const next = () => {
    setIndex((i) => (i + 1) % slides.length);
    kick();
  };
  const prev = () => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
    kick();
  };
  const goTo = (i: number) => {
    setIndex(i);
    kick();
  };

  // hover handlers (tùy chọn)
  const onEnter = () => {
    if (!pauseOnHover) return;
    pausedRef.current = true;
    stop();
  };
  const onLeave = () => {
    if (!pauseOnHover) return;
    kick();
  };

  return (
    <section className={`w-full select-none ${className}`}>
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        /* Bỏ focus-capture để không bị pause khi bấm nút */
      >
        {/* Slide track */}
        <div
          className="relative h-[520px] md:h-[420px]"
          // click vào ảnh cũng "đá" lại autoplay
          onClick={kick}
        >
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      <div className={`absolute inset-0 flex ${align} justify-center p-6 md:p-12`} aria-live="polite">
        <div className="max-w-xl space-y-4 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide">
            Fresh & curated
          </span>
          <h1 className="text-3xl font-extrabold md:text-5xl">{slide.title}</h1>
          {"caption" in slide && slide.caption && (
            <p className="text-base/relaxed md:text-lg/relaxed text-white/90">{slide.caption}</p>
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
