"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdPhoneIphone, MdLockOutline, MdVisibility, MdVisibilityOff } from "react-icons/md";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) return setError("Please enter your email.");
    if (pwd.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: phone, // Using phone variable for email in this form
          password: pwd
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Lưu tokens
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);

        alert('Đăng nhập thành công!');
        router.push("/");
      } else {
        setError(data.error || 'Đăng nhập thất bại.');
      }
    } catch (error) {
      setError('Không thể kết nối đến server. Vui lòng thử lại.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_520px] items-center gap-8 px-6 md:px-10 py-10">
      {/* LEFT: image */}
      <div className="hidden lg:block">
        <div className="rounded-2xl shadow-smooth overflow-hidden max-w-[720px] ml-auto bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-4xl">A</span>
            </div>
            <h3 className="text-2xl font-bold text-brand-dark mb-2">Welcome Back!</h3>
            <p className="text-brand-secondary">AI-Powered Fashion Shopping</p>
          </div>
        </div>
      </div>

      {/* RIGHT: form */}
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-smooth">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-brand-dark">AIFShop</h1>
          <p className="text-sm text-brand-secondary">AI-Powered Jewelry Shopping</p>
        </div>

        <div className="rounded-2xl bg-white shadow-smooth border border-brand-light/70 p-6">
          <h2 className="text-xl font-semibold text-center">Welcome Back</h2>
          <p className="text-sm text-center text-brand-secondary mb-4">
            Sign in to discover your perfect style
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <div className="relative">
                <MdPhoneIphone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type="email"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your email"
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
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-brand-light px-10 py-2 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <MdVisibilityOff className="w-5 h-5" />
                  ) : (
                    <MdVisibility className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-brand-light"
                />
                Remember me
              </label>
              <a href="#" className="text-brand-primary hover:underline">
                Forgot password?
              </a>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-brand-light" />
              <span className="text-xs text-brand-secondary">or continue with</span>
              <div className="h-px flex-1 bg-brand-light" />
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={() => alert("Google Sign-In (demo)")}
              className="w-full rounded-xl py-2.5 border border-brand-light flex items-center justify-center gap-2 hover:bg-brand-light/40 transition"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Google
            </button>

            <p className="text-center text-sm text-brand-secondary">
              Don’t have an account?{" "}
              <Link href="/register" className="text-brand-primary hover:underline">
                Sign up 
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-4 text-xs text-center text-brand-secondary">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
