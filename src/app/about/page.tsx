"use client";

import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-brand-soft text-brand-dark">
      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full h-[320px] md:h-[420px] overflow-hidden">
        <Image
          src="/demo/about.jpg"
          alt="About AIFShop"
          fill
          className="object-cover"
          priority
        />
      </section>

      {/* ===== INTRODUCTION ===== */}
      <section className="max-w-6xl mx-auto px-4 py-10 md:py-16 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-primary text-center">
          Who We Are
        </h2>
        <p className="text-center max-w-3xl mx-auto text-brand-secondary leading-relaxed">
          AIFShop is an AI-powered fashion shopping platform that redefines the online retail experience.
          Our mission is to help shoppers discover styles they love effortlessly — with personalized
          recommendations, real-time support, and a seamless shopping experience powered by AI.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-10 items-center">
          <Image
            src="/demo/about.jpg"
            alt="AIFShop team"
            width={600}
            height={400}
            className="rounded-2xl shadow-smooth object-cover"
          />
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-brand-primary">
              Intelligent Shopping. Human Touch.
            </h3>
            <p className="text-brand-secondary leading-relaxed">
              We believe that technology should make shopping more intuitive, not more complicated.
              That’s why AIFShop combines AI insights with the warmth of human experience — giving you
              fashion advice, recommendations, and personalized care like never before.
            </p>
            <Link
              href="/shop"
              className="inline-block mt-2 rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold shadow hover:bg-brand-dark"
            >
              Explore Our Collection
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="bg-brand-light/60 py-14">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl bg-white shadow-smooth p-6 border border-brand-light">
            <h3 className="text-xl font-bold text-brand-primary mb-2">Our Mission</h3>
            <p className="text-brand-secondary leading-relaxed">
              To empower online shoppers and brands with smart tools that make fashion more accessible,
              personalized, and sustainable through Artificial Intelligence.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-smooth p-6 border border-brand-light">
            <h3 className="text-xl font-bold text-brand-primary mb-2">Our Vision</h3>
            <p className="text-brand-secondary leading-relaxed">
              To become the leading AI-driven fashion platform that connects people, style, and innovation,
              creating meaningful shopping experiences for every user.
            </p>
          </div>
        </div>
      </section>

      {/* ===== TEAM ===== */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-brand-primary mb-8">
          Meet Our Team
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-center">
          {[
            { name: "Huynh Yen Vi", role: "CEO & Founder", img: "/demo/vi.jpg" },
            { name: "Phan Thi Minh Phuong ", role: "Fashion Designerr", img: "/demo/phươnng.jpg" },
            { name: "Le Quang Minh Da", role: "Engineer", img: "/demo/da.jpg" },
            { name: "Vo Xuan Y", role: "Engineer", img: "/demo/ý.jpg" },
            { name: "Ngo Ho Thanh Tuan", role: "Engineer", img: "/demo/tuan.jpg" },
          ].map((m, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-brand-light shadow-smooth p-5 space-y-3"
            >
              <Image
                src={m.img}
                alt={m.name}
                width={200}
                height={200}
                className="w-32 h-32 mx-auto rounded-full object-cover border border-brand-light"
              />
              <h4 className="font-semibold text-brand-dark">{m.name}</h4>
              <p className="text-sm text-brand-secondary">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-brand-accent text-brand-dark py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold">
          Join us in shaping the future of fashion with AI.
        </h2>
        <Link
          href="/contact"
          className="inline-block mt-4 rounded-xl bg-brand-primary text-white px-6 py-3 text-sm font-semibold shadow hover:bg-brand-dark"
        >
          Contact Us
        </Link>
      </section>
    </main>
  );
}
