"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AboutPage() {

  const [open, setOpen] = useState(false);
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
          AIFShop là gì ?
        </h2>
        <p className="text-center max-w-3xl mx-auto text-brand-secondary leading-relaxed">
          AIFShop là nền tảng mua sắm thời trang ứng dụng AI, định nghĩa lại trải nghiệm bán lẻ trực tuyến. 
          Sứ mệnh của chúng tôi là giúp người mua sắm khám phá những phong cách yêu thích một cách dễ dàng — với các đề xuất được cá nhân hóa,
           hỗ trợ theo thời gian thực và trải nghiệm mua sắm liền mạch được hỗ trợ bởi AI.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-10 items-center">
          <Image
            src="/demo/anh.png"
            alt="AIFShop team"
            width={600}
            height={400}
            className="rounded-2xl shadow-smooth object-cover"
          />
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-brand-primary">
              Mua sắm thông minh - Cảm ứng con người
            </h3>
            <p className="text-brand-secondary leading-relaxed">
              Chúng tôi tin rằng công nghệ nên giúp việc mua sắm trở nên trực quan hơn, chứ không phải phức tạp hơn.
Đó là lý do tại sao AIFShop kết hợp những hiểu biết sâu sắc về AI với trải nghiệm ấm áp của con người — mang đến cho bạn
những lời khuyên, đề xuất và dịch vụ chăm sóc cá nhân hóa về thời trang chưa từng có
            </p>
            <Link
              href="/shop"
              className="inline-block mt-2 rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold shadow hover:bg-brand-dark"
            >
              Khám phá bộ sưu tập của chúng tôi
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="bg-brand-light/60 py-14">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl bg-white shadow-smooth p-6 border border-brand-light">
            <h3 className="text-xl font-bold text-brand-primary mb-2">Sứ mệnh</h3>
            <p className="text-brand-secondary leading-relaxed">
              Trao quyền cho người mua sắm và thương hiệu trực tuyến bằng các công cụ thông minh giúp thời trang dễ tiếp cận hơn, 
              được cá nhân hóa và bền vững hơn thông qua Trí tuệ nhân tạo.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-smooth p-6 border border-brand-light">
            <h3 className="text-xl font-bold text-brand-primary mb-2">Tầm nhìn</h3>
            <p className="text-brand-secondary leading-relaxed">
              Trở thành nền tảng thời trang hàng đầu ứng dụng AI, kết nối con người, phong cách và sự đổi mới,
              tạo ra trải nghiệm mua sắm ý nghĩa cho mọi người dùng.
            </p>
          </div>
        </div>
      </section>

      {/* ===== TEAM ===== */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-brand-primary mb-8">
          Đội ngũ của chúng tôi
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
      <section className="bg-brand-accent text-brand-dark py-14 text-center relative">
      <h2 className="text-2xl md:text-3xl font-extrabold">
        Join us in shaping the future of fashion with AI.
      </h2>

      {/* Button mở popup */}
      <button
        onClick={() => setOpen(true)}
        className="inline-block mt-5 rounded-xl bg-brand-primary text-white px-6 py-3 text-sm font-semibold shadow hover:bg-brand-dark transition-all"
      >
        Contact Us
      </button>

      {/* Popup */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay mờ nền */}
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Popup content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-left text-brand-dark relative">
                <h3 className="text-xl font-bold mb-4">Thông tin liên hệ</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    📍 <span className="font-semibold">Địa chỉ:</span> Đại học FPT Quy Nhơn, Quy Nhơn Đông, Gia Lai, Bình Định
                  </li>
                  <li>
                    ✉️ <span className="font-semibold">Email:</span> supportaifshop@gmail.com
                  </li>
                  <li>
                    📞 <span className="font-semibold">Số điện thoại:</span> 0914167488
                  </li>
                </ul>

                {/* Close button */}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-brand-primary text-lg"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
    </main>
  );
}
