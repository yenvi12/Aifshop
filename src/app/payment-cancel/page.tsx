'use client';

import { useState, useEffect } from 'react';

export default function PaymentCancelPage() {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Update payment status to CANCELLED in database
    updatePaymentStatus();
  }, []);

  const updatePaymentStatus = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Get payment info from sessionStorage to get orderCode
      const storedPaymentInfo = sessionStorage.getItem('paymentInfo');
      if (storedPaymentInfo) {
        const parsed = JSON.parse(storedPaymentInfo);

        // Get Supabase token similar to payment page
        let supabaseToken: string | null = null;

        try {
          // Try to get from Supabase client first (most reliable method)
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          const supabase = createClient(supabaseUrl, supabaseAnonKey);

          const { data: { session } } = await supabase.auth.getSession();
          supabaseToken = session?.access_token || null;
        } catch (error) {
          console.error('Error getting Supabase session:', error);

          // If not available, try to get from localStorage (fallback)
          try {
            const storedAuth = localStorage.getItem('supabase.auth.token');
            if (storedAuth) {
              const authData = JSON.parse(storedAuth);
              supabaseToken = authData.access_token || null;
            }
          } catch (parseError) {
            console.error('Error parsing stored auth:', parseError);
          }
        }

        if (supabaseToken && parsed.orderCode) {
          const response = await fetch('/api/payment/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseToken}`,
            },
            body: JSON.stringify({
              orderCode: parsed.orderCode,
              status: 'CANCELLED'
            }),
          });

          if (response.ok) {
            console.log('Payment status updated to CANCELLED');
          } else {
            const errorText = await response.text();
            console.error('Failed to update payment status:', response.status, errorText);
          }
        } else {
          console.error('No valid token or orderCode found for updating payment status');
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all duration-300 hover:scale-105">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your payment was cancelled. No charges were made to your account.
          You can try again whenever you're ready.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/shop'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Continue Shopping
          </button>
        </div>

        {/* Help text */}
        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact our{" "}
          <a href="/support" className="text-red-600 hover:text-red-700 font-semibold">
            support team
          </a>
        </p>
      </div>
    </div>
  );
}
