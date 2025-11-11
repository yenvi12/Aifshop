'use client';

import { useState, useEffect } from 'react';

interface PaymentInfo {
  orderCode: string;
  amount: number;
  paymentMethod: string;
}

export default function PaymentSuccessPage() {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Get payment info from sessionStorage
    const storedPaymentInfo = sessionStorage.getItem('paymentInfo');

    if (storedPaymentInfo) {
      try {
        const parsed = JSON.parse(storedPaymentInfo);
        setPaymentInfo(parsed);

        // Update payment status in database (only for PayOS payments)
        console.log('Updating payment status for orderCode:', parsed.orderCode);
        updatePaymentStatus(parsed.orderCode);
      } catch (error) {
        console.error('Error parsing payment info:', error);
      }
    }
  }, []);

  const updatePaymentStatus = async (orderCode: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
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

      if (supabaseToken) {
        const response = await fetch('/api/payment/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseToken}`,
          },
          body: JSON.stringify({
            orderCode,
            status: 'SUCCESS'
          }),
        });

        if (response.ok) {
          console.log('Payment status updated to SUCCESS');
        } else {
          const errorText = await response.text();
          console.error('Failed to update payment status:', response.status, errorText);
        }
      } else {
        console.error('No valid token found for updating payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all duration-300 hover:scale-105">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Thank you for your purchase! Your payment has been processed successfully.
          You will receive an order confirmation email shortly.
        </p>

        {/* Order Details Placeholder */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Order Number:</span>
              <span className="font-mono">#{paymentInfo?.orderCode || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-semibold text-green-600">
                {paymentInfo?.amount ? `${paymentInfo.amount.toLocaleString('vi-VN')}₫` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>{paymentInfo?.paymentMethod || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.href = '/orders'}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            View Order Details
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
          Questions about your order?{" "}
          <a href="/support" className="text-green-600 hover:text-green-700 font-semibold">
            We`&apos;re here to help
          </a>
        </p>
      </div>
    </div>
  );
}
