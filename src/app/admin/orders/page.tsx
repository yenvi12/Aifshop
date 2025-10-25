"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdAdd, MdEdit, MdDelete, MdShoppingCart, MdSearch, MdFilterList, MdCheckBox, MdCheckBoxOutlineBlank, MdDeleteSweep, MdLocalShipping, MdSchedule, MdDone, MdPayment, MdPeople, MdViewList, MdViewModule, MdRefresh, MdCheckCircle, MdSchedule as MdTime, MdError, MdVisibility, MdUpdate } from "react-icons/md";
import toast from "react-hot-toast";

interface Order {
   id: string;
   orderNumber: string;
   status: string;
   totalAmount: number;
   trackingNumber?: string;
   estimatedDelivery?: Date;
   createdAt: Date;
   updatedAt: Date;
   shippingAddress?: {
     shipping?: string;
     billing?: string;
   } | null;
  orderItems: Array<{
    id: string;
    quantity: number;
    priceAtTime: number;
    product: {
      id: string;
      name: string;
      image?: string;
      slug: string;
    };
  }>;
  payment: {
    id: number;
    orderCode: string;
    status: string;
    amount: number;
  };
  user: {
    id: string;
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

export default function ManageOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Bulk selection states
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch orders when filters or page change
  useEffect(() => {
    if (searchTerm || statusFilter || paymentStatusFilter || currentPage > 1) {
      fetchOrders(currentPage, searchTerm, statusFilter, paymentStatusFilter);
    } else {
      fetchOrders(currentPage);
    }
  }, [searchTerm, statusFilter, paymentStatusFilter, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentStatusFilter]);

  const fetchOrders = async (page: number = 1, search?: string, status?: string, paymentStatus?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '6'
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token invalid hoặc user không phải admin
        console.error('Authentication failed: Invalid token or insufficient permissions');
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('accessToken'); // Clear invalid token
        router.push('/login');
        return;
      }

      if (response.status === 403) {
        // User không phải admin
        console.error('Access denied: Admin role required');
        toast.error('Admin access required');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData.error || response.statusText);
        toast.error(errorData.error || 'Failed to load orders');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalCount(result.pagination.totalCount);
        setCurrentPage(result.pagination.page);
      } else {
        console.error('Business logic error:', result.error);
        toast.error(result.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        // Handle auth errors silently for filter data
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAllOrders(result.data); // For filters
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders for categories:', error);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // Optimistic update - immediately update UI
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    setUpdatingStatus(orderId);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Order status updated successfully');
        // Keep the optimistic update, just refresh to ensure consistency
        fetchOrders();
      } else {
        // Revert optimistic update on failure
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: orders.find(o => o.id === orderId)?.status || order.status } : order
          )
        );
        toast.error('Failed to update order status');
      }
    } catch (error) {
      // Revert optimistic update on error
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: orders.find(o => o.id === orderId)?.status || order.status } : order
        )
      );
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/orders?id=${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Order deleted successfully');
        fetchOrders(); // Refresh list
      } else {
        toast.error('Failed to delete order');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete order');
    }
    setShowDeleteConfirm(false);
    setSelectedOrder(null);
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const updatePromises = selectedOrders.map(id => {
        return fetch(`/api/admin/orders/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`${successCount} order(s) status updated to ${newStatus.toLowerCase()} successfully`);
        fetchOrders();
        setSelectedOrders([]);
      } else {
        toast.error('Failed to update orders status');
      }
    } catch (error) {
      console.error('Bulk status update error:', error);
      toast.error('Failed to update orders status');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const deletePromises = selectedOrders.map(id =>
        fetch(`/api/admin/orders?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} order(s) successfully`);
        fetchOrders();
        setSelectedOrders([]);
      } else {
        toast.error('Failed to delete orders');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete orders');
    }
  };

  // Get unique statuses for filter dropdown
  const orderStatuses = Array.from(new Set(allOrders.map(o => o.status)));
  const paymentStatuses = Array.from(new Set(allOrders.map(o => o.payment.status)));

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-light/30">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-light/30">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-dark">Manage Orders</h1>
              <p className="text-brand-secondary">View and manage customer orders</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border ${
                viewMode === 'grid'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
              }`}
              title="Grid View"
            >
              <MdViewModule className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border ${
                viewMode === 'list'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
              }`}
              title="List View"
            >
              <MdViewList className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        {allOrders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-brand-light p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-secondary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search orders by order number or customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                >
                  <option value="">All Order Status</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                >
                  <option value="">All Payment Status</option>
                  {paymentStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedOrders.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-light">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-secondary">
                    {selectedOrders.length} order(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                    className="px-3 py-2 border border-brand-light rounded-lg text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>Update Status</option>
                    <option value="CONFIRMED">Confirm</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Ship</option>
                    <option value="DELIVERED">Deliver</option>
                    <option value="CANCELLED">Cancel</option>
                  </select>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Display */}
        {orders.length === 0 && totalCount > 0 ? (
          <div className="text-center py-12">
            <MdSearch className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No orders found</h3>
            <p className="text-brand-secondary">Try adjusting your search or filters</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <MdShoppingCart className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No orders yet</h3>
            <p className="text-brand-secondary mb-6">Orders will appear here when customers place them</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:opacity-90"
            >
              <MdAdd className="w-5 h-5" />
              Go to Admin Dashboard
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
                {/* Checkbox for bulk selection */}
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={() => handleSelectOrder(order.id)}
                    className="w-6 h-6 bg-white/90 rounded border border-brand-light flex items-center justify-center hover:bg-white"
                  >
                    {selectedOrders.includes(order.id) ? (
                      <MdCheckBox className="w-5 h-5 text-brand-primary" />
                    ) : (
                      <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                    )}
                  </button>
                </div>

                {/* Order Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-brand-dark mb-1">{order.orderNumber}</h3>
                  <p className="text-sm text-brand-secondary mb-2">{order.user.firstName} {order.user.lastName}</p>

                  {/* Status */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      order.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      order.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                      order.status === 'ORDERED' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {order.status === 'DELIVERED' && <MdCheckCircle className="w-3 h-3" />}
                      {order.status === 'SHIPPED' && <MdLocalShipping className="w-3 h-3" />}
                      {order.status === 'PROCESSING' && <MdSchedule className="w-3 h-3" />}
                      {order.status === 'CANCELLED' && <MdError className="w-3 h-3" />}
                      {order.status}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                      order.payment.status === 'SUCCESS' ? 'bg-green-100 text-green-800 border-green-200' :
                      order.payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {order.payment.status === 'SUCCESS' && <MdCheckCircle className="w-3 h-3" />}
                      {order.payment.status === 'PENDING' && <MdTime className="w-3 h-3" />}
                      {order.payment.status === 'CANCELLED' && <MdError className="w-3 h-3" />}
                      Payment: {order.payment.status}
                    </span>
                  </div>

                  {/* Total */}
                  <p className="text-lg font-bold text-brand-dark">{order.payment.amount.toLocaleString('vi-VN')}₫</p>
                  {order.payment.amount !== order.totalAmount && (
                    <p className="text-xs text-yellow-600 mt-1">
                      (ĐH: {order.totalAmount.toLocaleString('vi-VN')}₫)
                    </p>
                  )}

                  {/* Items */}
                  <div className="mb-4">
                    <p className="text-sm text-brand-secondary">{order.orderItems.length} item(s)</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                      title="View Order Details"
                    >
                      <MdVisibility className="w-4 h-4" />
                      View Details
                    </button>
                    <div className="relative">
                      <select
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        className={`px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white shadow-md hover:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 font-medium ${updatingStatus === order.id ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                        defaultValue={order.status}
                        disabled={updatingStatus === order.id}
                        title="Update Order Status"
                      >
                        <option value="ORDERED">📋 Ordered</option>
                        <option value="CONFIRMED">✅ Confirmed</option>
                        <option value="PROCESSING">⚙️ Processing</option>
                        <option value="SHIPPED">🚚 Shipped</option>
                        <option value="DELIVERED">🎉 Delivered</option>
                        <option value="CANCELLED">❌ Cancelled</option>
                      </select>
                      {updatingStatus === order.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                      title="Delete Order"
                    >
                      <MdDelete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-light/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 hover:bg-brand-light/50 px-2 py-1 rounded"
                      >
                        {selectedOrders.length === orders.length && orders.length > 0 ? (
                          <MdCheckBox className="w-5 h-5 text-brand-primary" />
                        ) : (
                          <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                        )}
                        Order
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Date</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-brand-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-brand-light/25">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelectOrder(order.id)}
                            className="w-5 h-5 mr-2 flex-shrink-0"
                          >
                            {selectedOrders.includes(order.id) ? (
                              <MdCheckBox className="w-5 h-5 text-brand-primary" />
                            ) : (
                              <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                            )}
                          </button>
                          <div>
                            <div className="font-medium text-brand-dark">{order.orderNumber}</div>
                            <div className="text-sm text-brand-secondary">{order.orderItems.length} item(s)</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-brand-dark">{order.user.firstName} {order.user.lastName}</div>
                          <div className="text-brand-secondary">{order.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          order.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                          order.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          order.status === 'ORDERED' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {order.status === 'DELIVERED' && <MdCheckCircle className="w-3 h-3" />}
                          {order.status === 'SHIPPED' && <MdLocalShipping className="w-3 h-3" />}
                          {order.status === 'PROCESSING' && <MdSchedule className="w-3 h-3" />}
                          {order.status === 'CANCELLED' && <MdError className="w-3 h-3" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                          order.payment.status === 'SUCCESS' ? 'bg-green-100 text-green-800 border-green-200' :
                          order.payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {order.payment.status === 'SUCCESS' && <MdCheckCircle className="w-3 h-3" />}
                          {order.payment.status === 'PENDING' && <MdTime className="w-3 h-3" />}
                          {order.payment.status === 'CANCELLED' && <MdError className="w-3 h-3" />}
                          {order.payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-brand-dark">
                        {order.payment.amount.toLocaleString('vi-VN')}₫
                        {order.payment.amount !== order.totalAmount && (
                          <div className="text-xs text-yellow-600">
                            (ĐH: {order.totalAmount.toLocaleString('vi-VN')}₫)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                            title="View Order Details"
                          >
                            <MdVisibility className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <select
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                              className={`px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs bg-white shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 font-medium ${updatingStatus === order.id ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                              defaultValue={order.status}
                              disabled={updatingStatus === order.id}
                              title="Update Order Status"
                            >
                              <option value="ORDERED">📋 Ordered</option>
                              <option value="CONFIRMED">✅ Confirmed</option>
                              <option value="PROCESSING">⚙️ Processing</option>
                              <option value="SHIPPED">🚚 Shipped</option>
                              <option value="DELIVERED">🎉 Delivered</option>
                              <option value="CANCELLED">❌ Cancelled</option>
                            </select>
                            {updatingStatus === order.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                            title="Delete Order"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                  currentPage === 1
                    ? 'border-brand-light text-brand-secondary cursor-not-allowed'
                    : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'
                }`}
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                    currentPage === page
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                  currentPage === totalPages
                    ? 'border-brand-light text-brand-secondary cursor-not-allowed'
                    : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-brand-dark mb-4">Delete Order</h3>
              <p className="text-brand-secondary mb-6">
                Are you sure you want to delete order &quot;{selectedOrder.orderNumber}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light/50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(selectedOrder.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-brand-dark">Order Details - {selectedOrder.orderNumber}</h3>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-brand-secondary hover:text-brand-dark"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-brand-light/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-brand-dark mb-2">Order Status</h4>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${
                        selectedOrder.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                        selectedOrder.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        selectedOrder.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        selectedOrder.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                        selectedOrder.status === 'ORDERED' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                        selectedOrder.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {selectedOrder.status === 'DELIVERED' && <MdCheckCircle className="w-4 h-4" />}
                        {selectedOrder.status === 'SHIPPED' && <MdLocalShipping className="w-4 h-4" />}
                        {selectedOrder.status === 'PROCESSING' && <MdSchedule className="w-4 h-4" />}
                        {selectedOrder.status === 'CANCELLED' && <MdError className="w-4 h-4" />}
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="bg-brand-light/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-brand-dark mb-2">Payment Status</h4>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${
                        selectedOrder.payment.status === 'SUCCESS' ? 'bg-green-100 text-green-800 border-green-200' :
                        selectedOrder.payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {selectedOrder.payment.status === 'SUCCESS' && <MdCheckCircle className="w-4 h-4" />}
                        {selectedOrder.payment.status === 'PENDING' && <MdTime className="w-4 h-4" />}
                        {selectedOrder.payment.status === 'CANCELLED' && <MdError className="w-4 h-4" />}
                        {selectedOrder.payment.status}
                      </span>
                    </div>
                    <div className="bg-brand-light/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-brand-dark mb-2">Payment Amount</h4>
                      <p className="text-xl font-bold text-brand-primary">{selectedOrder.payment.amount.toLocaleString('vi-VN')}₫</p>
                      {selectedOrder.payment.amount !== selectedOrder.totalAmount && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <span className="font-medium">Order Total:</span> {selectedOrder.totalAmount.toLocaleString('vi-VN')}₫
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Có sự khác biệt giữa số tiền thanh toán và tổng đơn hàng
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-brand-light/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-brand-dark mb-3">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-brand-secondary">Name</p>
                        <p className="font-medium">{selectedOrder.user.firstName} {selectedOrder.user.lastName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-brand-secondary">Email</p>
                        <p className="font-medium">{selectedOrder.user.email}</p>
                      </div>
                      {selectedOrder.user.phoneNumber && (
                        <div>
                          <p className="text-sm text-brand-secondary">Phone</p>
                          <p className="font-medium">{selectedOrder.user.phoneNumber}</p>
                        </div>
                      )}
                      {selectedOrder.shippingAddress?.shipping ? (
                        <div className="md:col-span-2">
                          <p className="text-sm text-brand-secondary">Shipping Address</p>
                          <p className="font-medium">{selectedOrder.shippingAddress.shipping}</p>
                        </div>
                      ) : selectedOrder.user.defaultAddress?.shipping ? (
                        <div className="md:col-span-2">
                          <p className="text-sm text-brand-secondary">Shipping Address (Default)</p>
                          <p className="font-medium">{selectedOrder.user.defaultAddress.shipping}</p>
                        </div>
                      ) : (
                        <div className="md:col-span-2">
                          <p className="text-sm text-brand-secondary">Shipping Address</p>
                          <p className="font-medium text-gray-500 italic">No shipping address available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-white border border-brand-light rounded-lg p-4">
                    <h4 className="font-semibold text-brand-dark mb-4">Order Items ({selectedOrder.orderItems.length})</h4>
                    <div className="space-y-3">
                      {selectedOrder.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-brand-light/30 rounded-lg">
                          <img
                            src={item.product.image || '/placeholder.jpg'}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-brand-dark">{item.product.name}</p>
                            <p className="text-sm text-brand-secondary">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-dark">{(item.priceAtTime * item.quantity).toLocaleString('vi-VN')}₫</p>
                            <p className="text-sm text-brand-secondary">{item.priceAtTime.toLocaleString('vi-VN')}₫ each</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}