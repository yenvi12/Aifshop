'use client';

import { useState, useEffect } from 'react';

export default function PaymentCancelPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAttempts, setUpdateAttempts] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Update payment status to CANCELLED in database
    updatePaymentStatus();
  }, []);

  const updatePaymentStatus = async (isRetry = false) => {
    if (isUpdating) return;

    setIsUpdating(true);
    if (!isRetry) setUpdateAttempts(prev => prev + 1);

    try {
      // Get payment info from sessionStorage first, then localStorage as fallback
      let storedPaymentInfo = sessionStorage.getItem('paymentInfo');
      let storageSource = 'sessionStorage';

      if (!storedPaymentInfo) {
        // Try localStorage as fallback
        storedPaymentInfo = localStorage.getItem('paymentInfo');
        storageSource = 'localStorage';
      }

      if (!storedPaymentInfo) {
        console.error('No payment info found in sessionStorage or localStorage');
        setShowRetryButton(true);
        return;
      }

      console.log(`Payment info found in ${storageSource}`);

      const parsed = JSON.parse(storedPaymentInfo);
      if (!parsed.orderCode) {
        console.error('No orderCode found in payment info');
        setShowRetryButton(true);
        return;
      }

      // Get Supabase token with improved error handling
      let supabaseToken: string | null = null;
      let tokenSource = '';

      try {
        // Try to get from Supabase client first (most reliable method)
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Missing Supabase configuration');
          setShowRetryButton(true);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { session } } = await supabase.auth.getSession();
        supabaseToken = session?.access_token || null;
        tokenSource = supabaseToken ? 'supabase_session' : 'none';
      } catch (error) {
        console.error('Error getting Supabase session:', error);

        // If not available, try to get from localStorage (fallback)
        try {
          const storedAuth = localStorage.getItem('supabase.auth.token');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            supabaseToken = authData.access_token || null;
            tokenSource = supabaseToken ? 'localStorage' : 'none';
          }
        } catch (parseError) {
          console.error('Error parsing stored auth:', parseError);
          tokenSource = 'parse_error';
        }
      }

      if (!supabaseToken) {
        console.error('No valid token found for updating payment status');
        setShowRetryButton(true);
        return;
      }

      console.log(`Attempting to update payment status (attempt ${updateAttempts}, token from: ${tokenSource})`);

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
        const result = await response.json();
        console.log('Payment status updated to CANCELLED successfully:', result);
        setShowRetryButton(false);

        // Clean up both storages after successful update
        sessionStorage.removeItem('paymentInfo');
        localStorage.removeItem('paymentInfo');
        console.log(`Payment info cleaned up from ${storageSource}`);
      } else {
        const errorText = await response.text();
        console.error('Failed to update payment status:', response.status, errorText);

        // Show retry button if this wasn't a retry or if we haven't exceeded max attempts
        if (updateAttempts < 3) {
          setShowRetryButton(true);
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      if (updateAttempts < 3) {
        setShowRetryButton(true);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetry = () => {
    setShowRetryButton(false);
    updatePaymentStatus(true);
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

        {/* Status indicator */}
        {isUpdating && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-blue-700 font-medium">
                Đang cập nhật trạng thái thanh toán...
              </span>
            </div>
          </div>
        )}

        {/* Error indicator */}
        {showRetryButton && !isUpdating && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-yellow-700 font-medium">
                Không thể cập nhật trạng thái thanh toán
              </span>
            </div>
            <p className="text-xs text-yellow-600">
              Vui lòng thử lại hoặc liên hệ hỗ trợ nếu sự cố vẫn tiếp diễn.
            </p>
          </div>
        )}

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
          {showRetryButton && (
            <button
              onClick={handleRetry}
              disabled={isUpdating}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {isUpdating ? 'Đang thử lại...' : 'Thử lại cập nhật trạng thái'}
            </button>
          )}

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
