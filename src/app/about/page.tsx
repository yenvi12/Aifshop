"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaMagic, FaRobot, FaUsers, FaBolt, FaChartLine, FaRegLightbulb } from "react-icons/fa";

export default function AboutPage() {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-brand-soft text-brand-dark">
      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full overflow-hidden px-4 md:px-0 py-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-2xl group">
          <div className="relative w-full h-[220px] md:h-[360px]">
            <Image
              src="/demo/about.png"
              alt="About AIFShop"
              fill
              className="object-cover rounded-2xl "
              priority
            />
          </div>
        </div>
      </section>

      {/* ===== INTRODUCTION ===== */}
      <section className="max-w-6xl mx-auto px-4 py-10 md:py-16 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-primary text-center relative z-10 animate-float drop-shadow-xl">
          <span className="inline-flex items-center gap-2 justify-center">
            <FaMagic className="text-brand-accent text-xl md:text-2xl" /> AIFShop là gì ?
          </span>
        </h2>
        <p className="text-center max-w-3xl mx-auto text-brand-secondary leading-relaxed relative z-10 animate-float-slow drop-shadow-md">
          AIFShop là nền tảng mua sắm thời trang ứng dụng AI, định nghĩa lại trải nghiệm bán lẻ trực tuyến. 
          Sứ mệnh của chúng tôi là giúp người mua sắm khám phá những phong cách yêu thích một cách dễ dàng — với các đề xuất được cá nhân hóa,
          hỗ trợ theo thời gian thực và trải nghiệm mua sắm liền mạch được hỗ trợ bởi AI.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-10 items-center">
          <div className="group transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-2xl rounded-2xl overflow-hidden">
            <Image
              src="/demo/anh.png"
              alt="AIFShop team"
              width={600}
              height={400}
              className="rounded-2xl object-cover "
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-brand-primary relative z-10 animate-float drop-shadow-md">
              <span className="inline-flex items-center gap-2">
                <FaRobot className="text-brand-accent text-lg" /> Mua sắm thông minh - Cảm ứng con người
              </span>
            </h3>
            <p className="text-brand-secondary leading-relaxed relative z-10 animate-float-slow drop-shadow-sm">
              Chúng tôi tin rằng công nghệ nên giúp việc mua sắm trở nên trực quan hơn, chứ không phải phức tạp hơn.
              Đó là lý do tại sao AIFShop kết hợp những hiểu biết sâu sắc về AI với trải nghiệm ấm áp của con người — 
              mang đến cho bạn những lời khuyên, đề xuất và dịch vụ chăm sóc cá nhân hóa về thời trang chưa từng có
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
          {["Sứ mệnh", "Tầm nhìn"].map((title, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-brand-light p-6 shadow-smooth transition-transform duration-500 ease-in-out hover:scale-[1.03] hover:shadow-xl animate-float-slow"
            >
              <h3 className="text-xl font-bold text-brand-primary mb-2 drop-shadow-sm flex items-center gap-2">
                {i === 0 ? <FaMagic className="text-brand-accent" /> : <FaUsers className="text-brand-accent" />} {title}
              </h3>
              <p className="text-brand-secondary leading-relaxed drop-shadow-sm">
                {i === 0
                  ? "Trao quyền cho người mua sắm và thương hiệu trực tuyến bằng các công cụ thông minh giúp thời trang dễ tiếp cận hơn, được cá nhân hóa và bền vững hơn thông qua Trí tuệ nhân tạo."
                  : "Trở thành nền tảng thời trang hàng đầu ứng dụng AI, kết nối con người, phong cách và sự đổi mới, tạo ra trải nghiệm mua sắm ý nghĩa cho mọi người dùng."}
              </p>
            </div>
          ))}
        </div>
      </section>

            {/* ===== ABOUT PLATFORM DETAILS ===== */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-brand-primary text-center mb-12 pb-2 leading-tight">
            🌐 Nền tảng của AIFShop hoạt động như thế nào?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mb-6 shadow-lg mx-auto">
                💡
              </div>
              <h4 className="text-xl font-bold text-brand-dark mb-2">Tự động học hỏi</h4>
              <p className="text-brand-secondary text-sm leading-relaxed">
                Hệ thống AI cải thiện liên tục dựa trên hành vi người dùng, giúp các đề xuất ngày càng chính xác hơn.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center animate-fade-in-up delay-100">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center mb-6 shadow-lg mx-auto">
                🛍
              </div>
              <h4 className="text-xl font-bold text-brand-dark mb-2">Phân tích theo ngữ cảnh</h4>
              <p className="text-brand-secondary text-sm leading-relaxed">
                AIFShop hiểu bạn muốn gì dựa trên ngữ cảnh truy cập, thời gian, mùa vụ và lịch sử mua sắm gần nhất.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8 premium-card glow-on-hover text-center animate-fade-in-up delay-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center mb-6 shadow-lg mx-auto">
                📈
              </div>
              <h4 className="text-xl font-bold text-brand-dark mb-2">Cập nhật xu hướng</h4>
              <p className="text-brand-secondary text-sm leading-relaxed">
                Nền tảng luôn cập nhật xu hướng thời trang mới nhất để giúp bạn luôn sành điệu và hợp thời.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ===== CTA ===== */}
      <section className=" text-brand-dark py-14 text-center relative">
        <h2 className="text-2xl md:text-3xl font-extrabold">
          Join us in shaping the future of fashion with AI.
        </h2>

        <button
          onClick={() => setOpen(true)}
          className="inline-block mt-5 rounded-xl bg-brand-primary text-white px-6 py-3 text-sm font-semibold shadow hover:bg-brand-dark transition-all"
        >
          Contact Us
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />

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
