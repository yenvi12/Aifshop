import Image from "next/image";
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Section from "@/components/ui/Section";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { MdShoppingBag, MdPayment, MdKeyboardArrowRight, MdCheckCircle, MdSchedule, MdLocalShipping, MdDone, MdRefresh } from "react-icons/md";

// Types
interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  size?: string;
  priceAtTime: number;
  product: {
    id: string;
    name: string;
    image?: string;
    slug: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  shippingAddress?: {
    shipping?: string;
    billing?: string;
  };
  orderItems: OrderItem[];
  payment: {
    orderCode: string;
    status: string;
    amount: number;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    defaultAddress?: {
      shipping?: string;
      billing?: string;
    };
  };
}

interface Payment {
  id: number;
  orderCode: string;
  amount: number;
  status: string;
  createdAt: Date;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
  }>;
}

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetchData(session.access_token);
      } else {
        router.push('/login');
      }
    };
    getSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (token: string) => {
    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/payments', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.data || []);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <main className="min-h-screen bg-white text-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-dark">Orders & Payments</h1>
          <p className="text-brand-secondary mt-1">Track your orders and payment history</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-accent mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-primary'
            }`}
          >
            <MdShoppingBag className="w-4 h-4" />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-primary'
            }`}
          >
            <MdPayment className="w-4 h-4" />
            Payments ({payments.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'orders' && (
          <OrdersTab orders={orders} />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab payments={payments} />
        )}
      </div>
    </main>
  );
}

// Orders Tab Component
function OrdersTab({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <MdShoppingBag className="w-16 h-16 mx-auto text-brand-secondary/50 mb-4" />
        <h3 className="text-lg font-medium text-brand-dark mb-2">No orders yet</h3>
        <p className="text-brand-secondary mb-6">When you place an order, it will appear here</p>
        <button
          onClick={() => window.location.href = '/shop'}
          className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

// Payments Tab Component
function PaymentsTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <MdPayment className="w-16 h-16 mx-auto text-brand-secondary/50 mb-4" />
        <h3 className="text-lg font-medium text-brand-dark mb-2">No payment history</h3>
        <p className="text-brand-secondary mb-6">Your payment transactions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  );
}

// Order Progress Timeline Component
function OrderProgressTimeline({ status, createdAt, estimatedDelivery }: {
  status: string;
  createdAt: Date;
  estimatedDelivery?: Date;
}) {
  const steps = [
    { key: 'ordered', label: 'Order Placed', icon: MdCheckCircle, color: 'text-blue-600' },
    { key: 'confirmed', label: 'Order Confirmed', icon: MdSchedule, color: 'text-yellow-600' },
    { key: 'processing', label: 'Processing', icon: MdSchedule, color: 'text-orange-600' },
    { key: 'shipped', label: 'Shipped', icon: MdLocalShipping, color: 'text-indigo-600' },
    { key: 'delivered', label: 'Delivered', icon: MdDone, color: 'text-green-600' }
  ];

  const getCurrentStepIndex = () => {
    let statusIndex = steps.findIndex(step => step.key.toLowerCase() === status.toLowerCase());
    // For online payment, if payment is completed, automatically show "Order Confirmed" as completed
    if (statusIndex === 0) { // If still "ORDERED"
      statusIndex = 1; // Show as "CONFIRMED"
    }
    // Show full progress to "Order Confirmed" button
    if (statusIndex === 1) {
      return 1.2; // Extend progress slightly beyond "Order Confirmed" to touch the button
    }
    return statusIndex >= 0 ? statusIndex : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-brand-dark mb-3">Order Progress</h4>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-brand-accent">
          <div
            className="h-full bg-brand-primary transition-all duration-500"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'bg-white border-brand-accent text-brand-secondary'
                } ${isCurrent ? 'ring-4 ring-brand-primary/20' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${isCompleted ? 'text-brand-dark' : 'text-brand-secondary'}`}>
                    {step.label}
                  </p>
                  {index === 0 && (
                    <p className="text-xs text-brand-secondary mt-1">
                      {new Date(createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {index === steps.length - 1 && estimatedDelivery && (
                    <p className="text-xs text-brand-secondary mt-1">
                      Est: {new Date(estimatedDelivery).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(order.payment.status === 'PENDING' || order.status === 'SHIPPED');
  const [isReviewChooserOpen, setIsReviewChooserOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-300 shadow-blue-100';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-yellow-100';
      case 'processing': return 'bg-orange-100 text-orange-800 border-orange-300 shadow-orange-100';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-indigo-100';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300 shadow-green-100';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300 shadow-red-100';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-900 border-green-300 shadow-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300 shadow-yellow-100 animate-pulse';
      case 'failed':
        return 'bg-red-100 text-red-900 border-red-300 shadow-red-100';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300 shadow-gray-100';
    }
  };

  const getOrderUrgencyBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'failed') {
      return { text: 'Payment Failed', color: 'bg-red-600 text-white shadow-red-200', icon: MdKeyboardArrowRight };
    }
    if (paymentStatus === 'paid') {
      return { text: 'Payment Completed', color: 'bg-green-600 text-white shadow-green-200', icon: MdDone };
    }
    if (paymentStatus === 'pending') {
      return { text: 'Payment Completed', color: 'bg-green-600 text-white shadow-green-200', icon: MdDone };
    }
    if (status === 'CONFIRMED') {
      return { text: 'Confirmed', color: 'bg-yellow-600 text-white shadow-yellow-200', icon: MdCheckCircle };
    }
    if (status === 'SHIPPED') {
      return { text: 'Shipped Soon', color: 'bg-indigo-600 text-white shadow-indigo-200', icon: MdLocalShipping };
    }
    if (status === 'DELIVERED') {
      return { text: 'Delivered', color: 'bg-green-600 text-white shadow-green-200', icon: MdDone };
    }
    return null;
  };

  const handleWriteReviewClick = () => {
    if (order.orderItems.length === 1) {
      const onlyItem = order.orderItems[0];
      router.push(`/products/${onlyItem.product.slug}?review=1&fromOrder=${order.id}`);
    } else {
      setIsReviewChooserOpen(true);
    }
  };

  const goToReview = (item: OrderItem) => {
    router.push(`/products/${item.product.slug}?review=1&fromOrder=${order.id}`);
    setIsReviewChooserOpen(false);
  };

  const urgencyBadge = getOrderUrgencyBadge(order.status, order.payment.status);

  return (
    <div className={`border-2 rounded-3xl p-8 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
      order.payment.status === 'FAILED' ? 'border-red-300 bg-red-50/30' :
      order.payment.status === 'PENDING' ? 'border-yellow-300 bg-yellow-50/10' :
      order.status === 'DELIVERED' ? 'border-green-300 bg-green-50/30' :
      'border-brand-accent'
    }`}>
      {/* Header with Order Number and Badges */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-extrabold text-brand-dark tracking-tight">{order.orderNumber}</h3>
            {urgencyBadge && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold shadow-md ${urgencyBadge.color}`}>
                {urgencyBadge.icon && <urgencyBadge.icon className="w-4 h-4 mr-1" />}
                {urgencyBadge.text}
              </span>
            )}
          </div>
          <p className="text-base text-brand-secondary font-medium">
            Ordered on {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 shadow-sm ${getStatusColor(order.status)}`}>
            <MdCheckCircle className="w-4 h-4 mr-1" />
            {order.status}
          </span>
          {order.payment.status === 'paid' && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border-2 shadow-sm bg-green-100 text-green-900 border-green-300 shadow-green-100">
              Payment: Completed
            </span>
          )}
          {order.payment.status === 'failed' && (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border-2 shadow-sm ${getPaymentStatusBadge(order.payment.status)}`}>
              Payment: {order.payment.status}
            </span>
          )}
        </div>
      </div>

      {/* Order Progress Timeline */}
      {order.payment.status !== 'FAILED' && (
        <OrderProgressTimeline status={order.status} createdAt={order.createdAt} estimatedDelivery={order.estimatedDelivery} />
      )}

      {/* Payment Failed Notice */}
      {order.payment.status === 'FAILED' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MdPayment className="w-6 h-6 text-red-600" />
              <div>
                <h4 className="font-semibold text-red-800">Payment Failed</h4>
                <p className="text-sm text-red-700">Your payment could not be processed. Please try again.</p>
              </div>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium">
              Retry Payment
            </button>
          </div>
        </div>
      )}

      {/* Delivery Notice */}
      {order.status === 'DELIVERED' && (
        <>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MdDone className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Order Delivered Successfully!</h4>
                  <p className="text-sm text-green-700">Your order has been delivered. Enjoy your purchase!</p>
                </div>
              </div>
              <button
                onClick={handleWriteReviewClick}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Write Review
              </button>
            </div>
          </div>

          {/* Product chooser modal for multi-item orders */}
          {isReviewChooserOpen && order.orderItems.length > 1 && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Chọn sản phẩm để đánh giá</h3>
                  <button
                    onClick={() => setIsReviewChooserOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <img
                        src={item.product.image || '/placeholder.jpg'}
                        alt={item.product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        {item.size && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                      </div>
                      <button
                        onClick={() => goToReview(item)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Đánh giá
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t text-right">
                  <button
                    onClick={() => setIsReviewChooserOpen(false)}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Estimated Delivery Notice */}
      {order.status === 'SHIPPED' && order.estimatedDelivery && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MdLocalShipping className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-800">Out for Delivery</h4>
                <p className="text-sm text-blue-700">
                  Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            {order.trackingNumber && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Track Package
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="space-y-4 mb-6">
        <h4 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
          <MdShoppingBag className="w-5 h-5" />
          Order Items ({order.orderItems.length})
        </h4>
        {order.orderItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4 bg-brand-light/50 rounded-2xl border border-brand-light shadow-sm hover:shadow-md transition-shadow">
            <img
              src={item.product.image || '/placeholder.jpg'}
              alt={item.product.name}
              className="w-16 h-16 rounded-xl object-cover shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-brand-dark truncate">{item.product.name}</p>
              <p className="text-sm text-brand-secondary mt-1">Qty: {item.quantity} {item.size && `• Size: ${item.size}`}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-brand-dark">{(item.priceAtTime * item.quantity).toLocaleString('vi-VN')}₫</p>
              <p className="text-sm text-brand-secondary">{item.priceAtTime.toLocaleString('vi-VN')}₫ each</p>
            </div>
          </div>
        ))}
      </div>


      {/* Order Footer */}
      <div className="flex items-center justify-between pt-6 border-t-2 border-brand-accent">
        <div className="flex items-center gap-6 text-base text-brand-secondary">
          {order.trackingNumber && (
            <div className="flex items-center gap-2">
              <MdLocalShipping className="w-5 h-5" />
              <span className="font-medium">Tracking: {order.trackingNumber}</span>
            </div>
          )}
          {order.estimatedDelivery && (
            <div className="flex items-center gap-2">
              <MdSchedule className="w-5 h-5" />
              <span className="font-medium">
                Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-brand-secondary font-medium">Total Amount</p>
            <span className="text-2xl font-bold text-brand-dark">
              {order.totalAmount > 0 ? order.totalAmount.toLocaleString('vi-VN') + '₫' : '0₫'}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl hover:bg-brand-primary/90 transition-colors font-semibold shadow-md"
          >
            <MdKeyboardArrowRight className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      </div>

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="mt-6 pt-6 border-t-2 border-brand-accent bg-gradient-to-br from-brand-light/30 to-white rounded-2xl p-6 shadow-inner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipient Information */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-brand-dark mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Recipient information
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-brand-secondary font-medium">Recipient Name</p>
                    <span className="font-semibold text-brand-dark">
                      {order.user?.firstName && order.user?.lastName
                        ? `${order.user.firstName} ${order.user.lastName}`
                        : 'Name not available'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-brand-secondary font-medium">Email Address</p>
                    <span className="font-semibold text-brand-dark">{order.user?.email || 'Email not available'}</span>
                  </div>
                </div>

                {order.user?.phoneNumber && (
                  <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-brand-secondary font-medium">Phone Number</p>
                      <span className="font-semibold text-brand-dark">{order.user.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Shipping address
              </h4>
              <div className="flex items-start gap-4 p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-brand-secondary font-medium mb-1">Delivery Address</p>
                  <p className="text-sm text-brand-dark font-medium break-words leading-relaxed">
                    {order.shippingAddress?.shipping || order.user?.defaultAddress?.shipping || 'No shipping address provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Order timeline
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-dark">Order Placed</p>
                    <p className="text-xs text-brand-secondary">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {order.status !== 'ORDERED' && (
                  <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark">Status Updated</p>
                      <p className="text-xs text-brand-secondary">Order {order.status.toLowerCase()}</p>
                    </div>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark">Estimated Delivery</p>
                      <p className="text-xs text-brand-secondary">{new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Card Component
function PaymentCard({ payment }: { payment: Payment }) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-300',
          icon: MdDone,
          label: 'Successful'
        };
      case 'pending':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-300',
          icon: MdDone,
          label: 'Completed'
        };
      case 'failed':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-300',
          icon: MdRefresh,
          label: 'Failed'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-300',
          icon: MdPayment,
          label: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusColor(payment.status);
  const StatusIcon = statusInfo.icon;

  // Format VND currency
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className={`border-2 rounded-2xl p-5 bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
      payment.status === 'failed' ? 'border-red-200 bg-red-50/30' :
      payment.status === 'pending' ? 'border-yellow-200 bg-yellow-50/20' :
      'border-brand-accent'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            payment.status === 'paid' ? 'bg-green-100' :
            payment.status === 'pending' ? 'bg-yellow-100' :
            payment.status === 'failed' ? 'bg-red-100' :
            'bg-gray-100'
          }`}>
            <StatusIcon className={`w-5 h-5 ${
              payment.status === 'paid' ? 'text-green-600' :
              payment.status === 'pending' ? 'text-yellow-600' :
              payment.status === 'failed' ? 'text-red-600' :
              'text-gray-600'
            }`} />
          </div>
          <div>
            <p className="font-bold text-lg text-brand-dark">{payment.orderCode}</p>
            <p className="text-sm text-brand-secondary mt-1">
              {new Date(payment.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-green-600">{formatVND(payment.amount)}</p>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} shadow-sm mt-2`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-brand-light/50 rounded-lg p-3">
          <p className="text-xs text-brand-secondary font-medium">Payment Method</p>
          <p className="text-sm font-semibold text-brand-dark">PayOS</p>
        </div>
        <div className="bg-brand-light/50 rounded-lg p-3">
          <p className="text-xs text-brand-secondary font-medium">Transaction ID</p>
          <p className="text-sm font-semibold text-brand-dark truncate">{payment.id}</p>
        </div>
      </div>

      {/* Related Orders */}
      {payment.orders.length > 0 && (
        <div className="border-t border-brand-accent pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-brand-dark">
              Related Orders ({payment.orders.length})
            </p>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium flex items-center gap-1"
            >
              {showDetails ? 'Hide' : 'Show'} Details
              <MdKeyboardArrowRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {!showDetails ? (
            <div className="flex flex-wrap gap-2">
              {payment.orders.slice(0, 3).map((order) => (
                <span key={order.id} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-light/70 text-sm text-brand-dark font-medium border border-brand-accent">
                  {order.orderNumber}
                </span>
              ))}
              {payment.orders.length > 3 && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-600 font-medium">
                  +{payment.orders.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {payment.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-brand-light/30 rounded-lg border border-brand-accent/50">
                  <div>
                    <p className="font-medium text-brand-dark">{order.orderNumber}</p>
                    <p className="text-sm text-brand-secondary">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-dark">${order.totalAmount.toLocaleString('vi-VN')}₫</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}