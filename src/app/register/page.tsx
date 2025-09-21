"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MdPersonOutline,
  MdMailOutline,
  MdPhoneIphone,
  MdOutlineCalendarToday,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { FcGoogle } from "react-icons/fc";

export default function RegisterPage() {
  const router = useRouter();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [pwd, setPwd] = useState("");
  const [cpwd, setCpwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCpwd, setShowCpwd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!first.trim() || !email.includes("@") || pwd.length < 6) {
      setErr("Vui lòng nhập đầy đủ: họ tên, email hợp lệ và mật khẩu ≥ 6 ký tự.");
      return;
    }
    if (pwd !== cpwd) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!agree) {
      setErr("Bạn cần đồng ý Điều khoản & Chính sách.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // mock
    setLoading(false);
    router.push("/login");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_560px] items-start gap-10 px-6 md:px-10 py-10">
      {/* LEFT: brand header (tách riêng) + image card */}
      <div className="hidden lg:flex flex-col items-center">
  {/* Brand header */}
  <div className="flex flex-col items-center mb-6">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-smooth">
      <span className="text-white font-bold text-xl">A</span>
    </div>
    <h1 className="mt-2 text-2xl font-bold text-brand-dark">AIFShop</h1>
    <p className="text-sm text-brand-secondary">AI-Powered Fashion Shopping</p>
  </div>

  {/* Image card */}
  <div className="w-[500px] h-[500px] rounded-2xl shadow-smooth overflow-hidden">
    <img
      src="/login-model.jpg"
      alt="AIFShop model"
      className="w-full h-full object-cover"
    />
        </div>
      </div>

      {/* RIGHT: form card */}
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-2xl bg-white shadow-smooth border border-brand-light/70 p-6">
          <h2 className="text-lg font-semibold text-center">Create Account</h2>
          <p className="text-sm text-center text-brand-secondary mb-4">
            Join AIFShop and discover your perfect style
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <div className="relative">
                  <MdPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                  <input
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    placeholder="First name"
                    className="w-full rounded-xl border border-brand-light px-10 py-2 outline-none focus:ring-2 focus:ring-brand-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <div className="relative">
                  <MdPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                  <input
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    placeholder="Last name"
                    className="w-full rounded-xl border border-brand-light px-10 py-2 outline-none focus:ring-2 focus:ring-brand-primary/40"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <div className="relative">
                <MdMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-brand-light px-10 py-2 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <div className="relative">
                <MdPhoneIphone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full rounded-xl border border-brand-light px-10 py-2 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
              </div>
            </div>

            {/* DOB */}
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <div className="relative">
                <MdOutlineCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-xl border border-brand-light px-10 py-2 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <MdLockOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Create password"
                  className="w-full rounded-xl border border-brand-light px-10 py-2 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <MdLockOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type={showCpwd ? "text" : "password"}
                  value={cpwd}
                  onChange={(e) => setCpwd(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-brand-light px-10 py-2 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowCpwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary"
                  aria-label={showCpwd ? "Hide password" : "Show password"}
                >
                  {showCpwd ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Agreements */}
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="rounded border-brand-light"
                />
                I agree to the{" "}
                <a className="text-brand-primary hover:underline" href="#">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a className="text-brand-primary hover:underline" href="#">
                  Privacy Policy
                </a>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="rounded border-brand-light"
                />
                Subscribe to our newsletter for fashion updates and exclusive offers
              </label>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            {/* Divider */}
            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-brand-light" />
              <span className="text-xs text-brand-secondary">Or sign up with</span>
              <div className="h-px flex-1 bg-brand-light" />
            </div>

            <button
              type="button"
              onClick={() => alert("Google Sign-Up (demo)")}
              className="w-full rounded-xl py-2.5 border border-brand-light flex items-center justify-center gap-2 hover:bg-brand-light/40 transition"
            >
              <FcGoogle className="w-5 h-5" /> Google
            </button>

            <p className="text-center text-sm text-brand-secondary">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-4 text-xs text-center text-brand-secondary">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
