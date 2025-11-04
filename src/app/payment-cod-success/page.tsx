'use client';

import { useState, useEffect } from 'react';

interface OrderInfo {
  orderCode: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

export default function PaymentCODSuccessPage() {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order info from sessionStorage
    const storedOrderInfo = sessionStorage.getItem('orderInfo');

    if (storedOrderInfo) {
      try {
        const parsed = JSON.parse(storedOrderInfo);
        setOrderInfo(parsed);
        
        // Clear order info from sessionStorage after reading
        sessionStorage.removeItem('orderInfo');
        
        console.log('COD order info loaded:', parsed);
      } catch (error) {
        console.error('Error parsing order info:', error);
      }
    } else {
      console.warn('No order info found in sessionStorage');
    }
    
    setLoading(false);
  }, []);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + '₫';
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ORDERED':
      case 'PENDING':
        return 'text-orange-600 bg-orange-100';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100';
      case 'SHIPPED':
        return 'text-purple-600 bg-purple-100';
      case 'DELIVERED':
        return 'text-green-600 bg-green-100';
      case 'CANCELLED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Helper function to get status text in Vietnamese
  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ORDERED':
        return 'Đã đặt hàng';
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang vận chuyển';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!orderInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy thông tin đơn hàng
          </h1>
          <p className="text-gray-600 mb-8">
            Chúng tôi không thể tìm thấy thông tin đơn hàng COD của bạn.
          </p>
          <button
            onClick={() => window.location.href = '/orders'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Xem đơn hàng của tôi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all duration-300 hover:scale-105">
        {/* COD Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Đặt hàng thành công!
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Cảm ơn bạn đã đặt hàng! Đơn hàng COD của bạn đã được xác nhận. 
          Bạn sẽ thanh toán khi nhận hàng.
        </p>

        {/* Order Status */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderInfo.status)}`}>
            {getStatusText(orderInfo.status)}
          </span>
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Chi tiết đơn hàng</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Mã đơn hàng:</span>
              <span className="font-mono font-semibold text-blue-600">#{orderInfo.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Tổng tiền:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(orderInfo.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Phương thức thanh toán:</span>
              <span className="font-medium">Thanh toán khi nhận hàng (COD)</span>
            </div>
            <div className="flex justify-between">
              <span>Thời gian đặt hàng:</span>
              <span>{new Date().toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Hướng dẫn thanh toán
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Bạn sẽ thanh toán bằng tiền mặt khi nhận hàng</li>
            <li>• Vui lòng chuẩn bị số tiền: <strong>{formatCurrency(orderInfo.amount)}</strong></li>
            <li>• Hàng được giao đến địa chỉ bạn đã cung cấp</li>
            <li>• Kiểm tra hàng trước khi thanh toán</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.href = '/orders'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Xem chi tiết đơn hàng
          </button>
          <button
            onClick={() => window.location.href = '/shop'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Tiếp tục mua sắm
          </button>
        </div>

        {/* Help text */}
        <p className="text-sm text-gray-500 mt-6">
          Có thắc mắc về đơn hàng?{" "}
          <a href="/support" className="text-blue-600 hover:text-blue-700 font-semibold">
            Liên hệ hỗ trợ
          </a>
        </p>
      </div>
    </div>
  );
}