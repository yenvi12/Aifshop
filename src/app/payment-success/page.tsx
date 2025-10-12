'use client';

export default function PaymentSuccessPage() {
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
              <span className="font-mono">#12345</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-semibold text-green-600">$99.99</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>Credit Card</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.href = '/profile?tab=orders'}
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
            We're here to help
          </a>
        </p>
      </div>
    </div>
  );
}
