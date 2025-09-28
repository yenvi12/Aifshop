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
import { supabase } from "@/lib/supabase";

type Step = 'register' | 'otp'

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('register')
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

  // OTP step
  const [transactionId, setTransactionId] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!first.trim() || !last.trim() || !email.includes("@") || pwd.length < 6) {
      setErr("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }
    if (!dob) {
      setErr("Vui lòng nhập ngày sinh.");
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
    try {
      const payload = {
        firstName: first.trim(),
        lastName: last.trim(),
        email: email.trim(),
        phoneNumber: phone.trim() || undefined,
        dateOfBirth: dob,
        password: pwd,
        confirmPassword: cpwd
      };

      console.log('Sending payload:', payload); // Debug log

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionId(data.transactionId);
        setStep('otp');
      } else {
        // Show detailed error
        let errorMessage = data.error || 'Có lỗi xảy ra. Vui lòng thử lại.';

        if (data.details) {
          const errorMessages = Object.values(data.details)
            .filter(detail => detail && typeof detail === 'object' && '_errors' in detail)
            .map(detail => (detail as any)._errors?.[0])
            .filter(Boolean)
            .join(', ');
          errorMessage = errorMessages || errorMessage;
        }

        // Show debug info in development
        if (data.debug) {
          errorMessage += ` (Debug: ${data.debug})`;
        }

        setErr(errorMessage);
      }
    } catch (error) {
      setErr('Không thể kết nối đến server. Vui lòng thử lại.');
    }
    setLoading(false);
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (otp.length !== 6) {
      setErr("OTP phải có 6 chữ số.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transactionId.trim(),
          otp: otp.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Lưu tokens vào localStorage
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);

        alert('Đăng ký thành công! Chào mừng bạn đến với AIFShop.');
        router.push("/");
      } else {
        setErr(data.error || 'OTP không hợp lệ.');
      }
    } catch (error) {
      setErr('Không thể kết nối đến server. Vui lòng thử lại.');
    }
    setOtpLoading(false);
  }


  return (
  <div className="min-h-screen flex items-center">
    <div className="max-w-screen-xl w-full mx-auto px-6 md:px-10">
      {/* Grid 2 cột: ảnh trái + form phải */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_560px] gap-10 items-center my-6">
        
        {/* LEFT: image */}
        <div className="hidden lg:flex flex-col items-center">
          <div className="rounded-2xl shadow-smooth overflow-hidden max-w-[720px] w-full">
            <img
              src="/demo/dky.jpg"
              alt="AIFShop model"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

        {/* RIGHT: form card */}
        <div className="w-full max-w-lg mx-auto">
          <div className="rounded-2xl bg-white shadow-smooth border border-brand-light/70 p-6">
            {/* Logo nhỏ trên form */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-smooth">
                <span className="text-white font-bold text-xl">A</span>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-center">
              {step === "register" ? "Create Account" : "Verify Your Email"}
            </h2>
            <p className="text-sm text-center text-brand-secondary mb-4">
              {step === "register"
                ? "Join AIFShop and discover your perfect style"
                : `We've sent a 6-digit code to ${email}`}
            </p>






            {step === 'register' ? (
            <form onSubmit={onRegisterSubmit} className="space-y-4">
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
              {loading ? "Sending OTP..." : "Create Account"}
            </button>
          </form>
          ) : (
          <form onSubmit={onOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Enter 6-digit code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-xl border border-brand-light px-4 py-2 text-center text-2xl font-mono outline-none focus:ring-2 focus:ring-brand-primary/40"
                maxLength={6}
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <button
              type="submit"
              disabled={otpLoading || otp.length !== 6}
              className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
            >
              {otpLoading ? "Verifying..." : "Verify & Complete Registration"}
            </button>

            <button
              type="button"
              onClick={() => setStep('register')}
              className="w-full rounded-xl py-2.5 border border-brand-light hover:bg-brand-light/40 transition"
            >
              Back to Registration
            </button>
          </form>
        )}

        {/* Divider - only show on register step */}
        {step === 'register' && (
          <>
            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-brand-light" />
              <span className="text-xs text-brand-secondary">Or sign up with</span>
              <div className="h-px flex-1 bg-brand-light" />
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin
                    }
                  })
                  if (error) {
                    setErr(error.message)
                  }
                } catch (error) {
                  setErr('Failed to sign in with Google')
                }
              }}
              className="w-full rounded-xl py-2.5 border border-brand-light flex items-center justify-center gap-2 hover:bg-brand-light/40 transition"
            >
              <FcGoogle className="w-5 h-5" /> Google
            </button>
          </>
        )}

     <p className="text-center text-sm text-brand-secondary mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-4 text-xs text-center text-brand-secondary">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  </div>
);
}
