'use client';

export default function PaymentCancelPage() {
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
