"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdMailOutline, MdLockOutline, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { supabase } from "@/lib/supabase";

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'send-otp', email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-otp',
          email: email.trim(),
          otp: otp.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('password');
      } else {
        setError(data.error || 'Invalid OTP.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    setOtpLoading(false);
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPwd.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          email: email.trim(),
          newPassword: newPwd,
          confirmPassword: confirmPwd
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password reset successful! Please log in with your new password.');
        router.push("/login");
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    setResetLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center">
      <div className="max-w-screen-xl w-full mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center justify-items-center">

          {/* LEFT: Image column */}
          <div className="w-full max-w-[700px]">
            <div className="rounded-2xl shadow-smooth overflow-hidden w-full aspect-[4/5]">
              <img
                src="/demo/login.jpg"
                alt="AIFShop model"
                className="w-full h-full object-cover object-[50%_20%]"
              />
            </div>
          </div>

          {/* RIGHT: Form column */}
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-smooth">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-brand-dark">AIFShop</h1>
              <p className="text-sm text-brand-secondary">
                AI-Powered Jewelry Shopping
              </p>
            </div>

            <div className="rounded-2xl bg-white shadow-smooth border border-brand-light/70 p-6">
              <h2 className="text-xl font-semibold text-center">
                {step === "email" ? "Forgot Password" : step === "otp" ? "Verify OTP" : "Reset Password"}
              </h2>
              <p className="text-sm text-center text-brand-secondary mb-4">
                {step === "email"
                  ? "Enter your email to receive OTP"
                  : step === "otp"
                  ? `We've sent a 6-digit code to ${email}`
                  : "Enter your new password"}
              </p>

              {step === 'email' ? (
                <form onSubmit={onSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
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

                  {error && <div className="text-sm text-red-600">{error}</div>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>

                  <p className="text-center text-sm text-brand-secondary mt-4">
                    Remember your password?{" "}
                    <Link href="/login" className="text-brand-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              ) : step === 'otp' ? (
                <form onSubmit={onVerifyOtp} className="space-y-4">
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

                  {error && <div className="text-sm text-red-600">{error}</div>}

                  <button
                    type="submit"
                    disabled={otpLoading || otp.length !== 6}
                    className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
                  >
                    {otpLoading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="w-full rounded-xl py-2.5 border border-brand-light hover:bg-brand-light/40 transition"
                  >
                    Back to Email
                  </button>

                  <p className="text-center text-sm text-brand-secondary mt-4">
                    Remember your password?{" "}
                    <Link href="/login" className="text-brand-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={onResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <div className="relative">
                      <MdLockOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                      <input
                        type={showNewPwd ? "text" : "password"}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full rounded-xl border border-brand-light px-10 py-2 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary"
                        aria-label={showNewPwd ? "Hide password" : "Show password"}
                      >
                        {showNewPwd ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                    <div className="relative">
                      <MdLockOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5" />
                      <input
                        type={showConfirmPwd ? "text" : "password"}
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full rounded-xl border border-brand-light px-10 py-2 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary"
                        aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                      >
                        {showConfirmPwd ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && <div className="text-sm text-red-600">{error}</div>}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition"
                  >
                    {resetLoading ? "Resetting..." : "Reset Password"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('otp')}
                    className="w-full rounded-xl py-2.5 border border-brand-light hover:bg-brand-light/40 transition"
                  >
                    Back to OTP
                  </button>

                  <p className="text-center text-sm text-brand-secondary mt-4">
                    Remember your password?{" "}
                    <Link href="/login" className="text-brand-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}