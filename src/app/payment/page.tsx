"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

// Interface for cart item from API
interface CartItem {
  id: string;
  quantity: number;
  size: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image: string | null;
    images: string[];
    stock: number;
    sizes: string[];
    badge: string | null;
    slug: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: CartItem[];
  error?: string;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birthday: string;
  bio: string;
  avatar: string;
  stylePreferences: string[];
  defaultAddress: {
    shipping: string;
    billing: string;
  };
}

interface ProfileResponse {
  success?: boolean;
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  birthday?: string;
  bio?: string;
  avatar?: string;
  stylePreferences?: string[];
  defaultAddress?: {
    shipping: string;
    billing: string;
  };
  error?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState("payos");
  const [selectedShipping, setSelectedShipping] = useState("express");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Shipping address form state
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: ''
  });

  // Edit mode state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: ''
  });


  // Helper function to create short description for PayOS (max 25 characters)
  const createPaymentDescription = (itemCount: number, amount: number) => {
    const formattedAmount = amount.toLocaleString();
    const baseDesc = `DH${itemCount}SP-${formattedAmount}`;

    // Ensure description doesn't exceed 25 characters
    if (baseDesc.length > 25) {
      // Fallback to even shorter format if needed
      return `DH${itemCount}-${Math.floor(amount/1000)}K`;
    }

    return baseDesc;
  };

  // Fetch cart items from API
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập để thanh toán');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setCartItems(data.data);
      } else {
        toast.error(data.error || 'Không thể tải giỏ hàng');
        router.push('/cart');
      }
    } catch (err) {
      toast.error('Không thể kết nối đến máy chủ');
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile from API
  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);

      // Lấy Supabase token thay vì JWT token
      let supabaseToken: string | null = null;

      try {
        // Thử lấy từ Supabase client trước (cách đáng tin cậy nhất)
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { session } } = await supabase.auth.getSession();
        supabaseToken = session?.access_token || null;
      } catch (error) {
        console.error('Error getting Supabase session:', error);

        // Nếu không được, thử lấy từ localStorage (fallback)
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


      if (!supabaseToken) {
        setLoadingProfile(false);
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ProfileResponse = await response.json();

      if (data && !data.error) {
        const profile = {
          id: data.id || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || null,
          birthday: data.birthday || '',
          bio: data.bio || '',
          avatar: data.avatar || '',
          stylePreferences: data.stylePreferences || [],
          defaultAddress: data.defaultAddress || { shipping: '', billing: '' }
        };

        setProfileData(profile);

        // Auto-fill shipping address from profile
        const nameParts = profile.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setShippingAddress({
          firstName,
          lastName,
          address: profile.defaultAddress?.shipping || '',
          city: '', // Will need to parse from address or add city field to profile
          postalCode: '' // Will need to parse from address or add postal code field to profile
        });
      } else {
        console.error('Profile API error:', data?.error);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.price || item.product.compareAtPrice || 0;
    return sum + (price * item.quantity);
  }, 0);

  const shippingCost = selectedShipping === "express" ? 15000 : selectedShipping === "standard" ? 10000 : 0;
  const total = subtotal + shippingCost;

  // Handle payment processing
  const handlePayment = async () => {
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    try {
      setProcessingPayment(true);

      // Get Supabase token similar to fetchProfile function
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

        // If not available, try to get from localStorage (fallback)
        try {
          const storedAuth = localStorage.getItem('supabase.auth.token');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            supabaseToken = authData.access_token || null;
          }
        } catch (parseError) {
        }
      }

      if (!supabaseToken) {
        toast.error('Vui lòng đăng nhập để thanh toán');
        router.push('/login');
        return;
      }

      // Create payment request
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total, // Send VND amount to PayOS
          description: createPaymentDescription(cartItems.length, total),
          cartItems, // Send cart items for order details
          shippingAddress, // Send shipping address for order details
          paymentMethod: 'PAYOS'
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl && data.orderCode) {
        // Save payment info to sessionStorage for payment success page
        const paymentInfo = {
          orderCode: data.orderCode, // Use orderCode from API
          amount: total,
          paymentMethod: 'PayOS'
        };
        sessionStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));

        // Redirect to PayOS
        window.location.href = data.checkoutUrl;
      } else {
        console.error('❌ Lỗi tạo thanh toán:', data.error);
        toast.error(data.error || 'Không thể tạo thanh toán');
      }
    } catch (err) {
      console.error('❌ Lỗi xử lý thanh toán:');
      console.error('- Chi tiết lỗi:', err);
      console.error('- Loại lỗi:', typeof err);
      if (err instanceof Error) {
        console.error('- Thông báo lỗi:', err.message);
        console.error('- Stack trace:', err.stack);
      }
      toast.error('Không thể xử lý thanh toán');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle COD payment processing
  const handleCODPayment = async () => {
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    // Validate shipping address
    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address) {
      toast.error('Vui lòng nhập đầy đủ thông tin giao hàng trước khi đặt hàng COD. Nhấn nút "Add shipping address" để cập nhật địa chỉ.');
      return;
    }

    try {
      setProcessingPayment(true);

      // Get Supabase token similar to fetchProfile function
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

        // If not available, try to get from localStorage (fallback)
        try {
          const storedAuth = localStorage.getItem('supabase.auth.token');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            supabaseToken = authData.access_token || null;
          }
        } catch (parseError) {
        }
      }

      if (!supabaseToken) {
        toast.error('Vui lòng đăng nhập để thanh toán');
        router.push('/login');
        return;
      }

      // Create COD order request
      const orderRequestData = {
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'ORDERED',
        amount: total,
        shippingAddress,
        cartItems,
        shippingMethod: selectedShipping,
      };

      console.log('🚀 Sending COD order request:', orderRequestData);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequestData),
      });

      const data = await response.json();

      if (data.success && data.order) {
        // Save order info to sessionStorage for order success page
        const orderInfo = {
          orderCode: data.order.orderCode || data.order.id,
          amount: total,
          paymentMethod: 'COD',
          status: 'PENDING'
        };
        sessionStorage.setItem('orderInfo', JSON.stringify(orderInfo));

        toast.success('Đơn hàng COD đã được tạo thành công! Bạn sẽ thanh toán khi nhận hàng.');
        router.push('/payment-cod-success');
      } else {
        console.error('❌ Lỗi tạo đơn hàng COD:', data.error);
        toast.error(data.error || 'Không thể tạo đơn hàng');
      }
    } catch (err) {
      console.error('❌ Lỗi xử lý thanh toán COD:');
      console.error('- Chi tiết lỗi:', err);
      console.error('- Loại lỗi:', typeof err);
      if (err instanceof Error) {
        console.error('- Thông báo lỗi:', err.message);
        console.error('- Stack trace:', err.stack);
      }
      toast.error('Không thể xử lý thanh toán COD');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Load cart items and profile on component mount
  useEffect(() => {
    fetchCartItems();
    fetchProfile();
  }, []);

  // Function to start editing address
  const handleEditAddress = () => {
    setEditedAddress({
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode
    });
    setIsEditingAddress(true);
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    setEditedAddress({
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      postalCode: ''
    });
  };

  // Function to save address changes
  const handleSaveAddress = async () => {
    try {
      // Get Supabase token for API call
      let supabaseToken: string | null = null;

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { session } } = await supabase.auth.getSession();
        supabaseToken = session?.access_token || null;
      } catch (error) {
        console.error('Error getting Supabase session:', error);
      }

      if (!supabaseToken) {
        toast.error('Vui lòng đăng nhập để cập nhật địa chỉ');
        return;
      }

      // Update shipping address state - this will be used in payment
      setShippingAddress(editedAddress);
      setIsEditingAddress(false);

      toast.success('Địa chỉ đã được cập nhật thành công');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Không thể cập nhật địa chỉ');
    }
  };

  // Function to handle input changes in edit form
  const handleAddressInputChange = (field: string, value: string) => {
    setEditedAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to reset to profile address
  const handleResetToProfile = () => {
    if (profileData?.defaultAddress?.shipping) {
      const nameParts = profileData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setEditedAddress({
        firstName,
        lastName,
        address: profileData.defaultAddress.shipping || '',
        city: '',
        postalCode: ''
      });
      toast.success('Đã reset về địa chỉ mặc định');
    }
  };
  
  //const inputClass = "border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  //const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-brand-light">
      

      <main className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-[2fr_1fr] gap-10">
        {/* LEFT SECTION */}
        <div className="space-y-8">
          {/* Shipping Address */}
          <section className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Shipping address
            </h2>

            {loadingProfile ? (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-sm p-6 rounded-xl mb-4 border border-gray-200">
                <div className="flex justify-center items-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mr-3"></div>
                  <span className="text-gray-600 font-medium">Loading address information...</span>
                </div>
              </div>
            ) : profileData ? (
              <div className="bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 border-2 border-brand-primary/20 text-sm p-6 rounded-xl mb-4 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-brand-primary/5 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-brand-primary/5 rounded-full translate-y-8 -translate-x-8"></div>

                <div className="relative z-10">
                  {/* Header with badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-semibold text-gray-900">Recipient information</span>
                      {isEditingAddress && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          Đang chỉnh sửa
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-brand-primary text-white rounded-full shadow-sm">Default</span>
                  </div>

                  {/* Customer info or Edit Form */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-white/40">
                      <svg className="w-4 h-4 text-brand-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-gray-900">{profileData.name || 'Name not updated'}</span>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-white/40">
                      <svg className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="text-gray-700 leading-relaxed">
                        {shippingAddress.address || shippingAddress.city || shippingAddress.postalCode ? (
                          <div className="text-sm">
                            {[shippingAddress.address, shippingAddress.city, shippingAddress.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        ) : profileData.defaultAddress?.shipping ? (
                          <div className="text-sm">{profileData.defaultAddress.shipping}</div>
                        ) : (
                          <span className="text-orange-600 font-medium">⚠️ Vui lòng cập nhật địa chỉ giao hàng</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-white/40">
                      <svg className="w-4 h-4 text-brand-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700">{profileData.email}</span>
                    </div>

                    {profileData.phone && (
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-white/40">
                        <svg className="w-4 h-4 text-brand-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-gray-700">{profileData.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit Form or Edit Button */}
                  {isEditingAddress ? (
                    <div className="mt-4 pt-4 border-t border-brand-primary/20">
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="First Name *"
                            value={editedAddress.firstName}
                            onChange={(e) => handleAddressInputChange('firstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                          <input
                            type="text"
                            placeholder="Last Name *"
                            value={editedAddress.lastName}
                            onChange={(e) => handleAddressInputChange('lastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Street Address * (số nhà, tên đường)"
                          value={editedAddress.address}
                          onChange={(e) => handleAddressInputChange('address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="City"
                            value={editedAddress.city}
                            onChange={(e) => handleAddressInputChange('city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={editedAddress.postalCode}
                            onChange={(e) => handleAddressInputChange('postalCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAddress}
                          className="flex-1 bg-brand-primary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors"
                        >
                          Save Address
                        </button>
                        <button
                          onClick={handleResetToProfile}
                          className="px-3 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                          title="Reset về địa chỉ mặc định từ profile"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-brand-primary/20">
                      <button
                        onClick={handleEditAddress}
                        className="w-full flex items-center justify-center gap-2 p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {shippingAddress.address ? 'Edit address' : 'Add shipping address'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 text-sm p-6 rounded-xl mb-4 relative">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="font-medium text-yellow-800">Unable to load address information</p>
                    <p className="text-yellow-700 mt-1">Please update your personal information to continue with your order.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Shipping Method */}
          <section className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping method</h2>
            <div className="space-y-3">
              {[
                { id: "express", label: "Express (1–2 days)", price: "15000" },
                { id: "standard", label: "Standard (3–5 days)", price: "10000" },
                { id: "preorder", label: "Preorder slot", price: "Ships in 2 weeks" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedShipping(method.id)}
                  //w-full rounded-xl py-2.5 bg-brand-accent text-brand-dark font-semibold border border-brand-light hover:bg-brand-accent/90 disabled:opacity-60 transition
                  className={`w-full p-2.5 rounded-xl  flex justify-between items-center border ${
                    selectedShipping === method.id ? "bg-brand-primary text-brand-light border-brand-light" : "bg-brand-primary/20 border-transparent"
                  }`}
                >
                  {method.label} <span className="text-xs">{method.price}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT SECTION: Order Summary */}
        <aside className="bg-white shadow-md rounded-xl p-6 h-fit sticky top-24">
          <h2 className="text-lg font-semibold mb-4">Order summary</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-gray-500 text-sm mt-2">Loading cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Cart is empty</p>
              <Link href="/cart" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                Back to cart
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Items */}
                {cartItems.map((item) => (
                  <div key={`${item.product.id}-${item.size || 'no-size'}`} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image || '/demo/placeholder.jpg'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-gray-500">
                        {item.quantity} × {((item.product.price || item.product.compareAtPrice) || 0).toLocaleString('vi-VN')}₫
                        {item.size && ` • Size: ${item.size}`}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {(((item.product.price || item.product.compareAtPrice) || 0) * item.quantity).toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                ))}
              </div>

              <input type="text" placeholder="Promo / Gift code" className="input w-full mt-4" />

              {/* Totals */}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shippingCost.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600 border-t pt-2">
                  <span>Total</span>
                  <span>{total.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={loading || cartItems.length === 0 || processingPayment}
              className="w-full rounded-xl py-3 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {processingPayment ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                `Thanh toán ${total.toLocaleString('vi-VN')}₫ với PayOS`
              )}
            </button>

            <button
              onClick={handleCODPayment}
              disabled={
                loading ||
                cartItems.length === 0 ||
                processingPayment ||
                !shippingAddress.firstName ||
                !shippingAddress.lastName ||
                !shippingAddress.address
              }
              className="w-full rounded-xl py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors mb-3"
              title={
                (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address)
                  ? 'Vui lòng nhập đầy đủ thông tin giao hàng'
                  : 'Thanh toán khi nhận hàng'
              }
            >
              {processingPayment ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xử lý...
                </div>
              ) : (
                `Thanh toán khi nhận hàng (COD)`
              )}
            </button>

            <button
              disabled={loading || cartItems.length === 0}
              className="w-full rounded-xl py-2.5 bg-gray-100 text-gray-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Xem lại đơn hàng
            </button>

            <Link href="/cart" className="block w-full text-center text-sm text-blue-600 hover:underline">
              ← Quay lại giỏ hàng
            </Link>

            <p className="text-xs text-gray-500 text-center">
              Bằng việc thanh toán, bạn đồng ý với <Link href="#" className="underline">Điều khoản</Link> và <Link href="#" className="underline">Chính sách hoàn tiền</Link> của chúng tôi.
            </p>
          </div>
        </aside>
      </main>

      <footer className="text-center text-xs py-6 text-brand-dark bg-brand-light">
        © 2025 AIFShop. All rights reserved. · <Link href="#">Privacy Policy</Link> · <Link href="#">Terms of Service</Link>
      </footer>
    </div>
  );
}

