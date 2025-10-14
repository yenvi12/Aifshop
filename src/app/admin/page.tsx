"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { MdAdd, MdInventory, MdPeople, MdAnalytics, MdLocalShipping } from "react-icons/md";
import Breadcrumb from "@/components/ui/Breadcrumb";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Stats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  ordersToday: number;
  pendingOrders: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setStatsLoading(true);
    setStatsError(null);

    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      } else {
        setStatsError(data.error || "Failed to fetch stats");
      }
    } catch (error) {
      setStatsError("Network error");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role !== "ADMIN") {
          router.push("/");
          return;
        }

        setUser({
          id: payload.userId,
          email: payload.email,
          firstName: "Admin",
          lastName: "User",
          role: payload.role,
        });

        // Fetch stats after admin access is confirmed
        await fetchStats();
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand.light/60 to-white">
        <Header />
        <Breadcrumb />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand.primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-brand.secondary">Đang tải bảng điều khiển...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const adminActions = [
    {
      title: "Add Product",
      description: "Create new products for your store",
      icon: MdAdd,
      href: "/admin/add-product",
      color: "bg-brand-primary",
      tint: "bg-brand-primary/10",
    },
    {
      title: "Manage Products",
      description: "Edit or remove existing products",
      icon: MdInventory,
      href: "/admin/products",
      color: "bg-emerald-500",
      tint: "bg-emerald-500/10",
    },
    {
      title: "Manage Users",
      description: "View and manage user accounts",
      icon: MdPeople,
      href: "/admin/users",
      color: "bg-violet-500",
      tint: "bg-violet-500/10",
    },
    {
      title: "Manage Orders",
      description: "View and manage customer orders",
      icon: MdLocalShipping,
      href: "/admin/orders",
      color: "bg-orange-500",
      tint: "bg-orange-500/10",
    },
    {
      title: "Analytics",
      description: "View store analytics and reports",
      icon: MdAnalytics,
      href: "/admin/analytics",
      color: "bg-amber-500",
      tint: "bg-amber-500/10",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand.light/60 to-white">
     

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {/* Page header */}
        <div className="mb-8 md:mb-10">
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-brand.dark">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm md:text-base text-brand.secondary">
            Manage your AIFShop store
          </p>
        </div>

        {/* Quick actions */}
        <section className="mb-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {adminActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group relative rounded-2xl border border-brand.light bg-white shadow-sm hover:shadow-smooth transition-all duration-300 hover:-translate-y-1"
              >
                <div className="p-5 md:p-6">
                  {/* FIXED ICON */}
                  <div
                    className={`w-12 h-12 rounded-xl ${action.tint} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <div
                      className={`${action.color} rounded-lg p-2.5 shadow-sm`}
                    >
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <h3 className="text-base md:text-lg font-semibold text-brand.dark">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm text-brand.secondary">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        <section className="rounded-2xl border border-brand.light bg-white shadow-smooth p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-brand.dark tracking-tight">
                Quick Stats
              </h2>
              <p className="text-sm text-brand.secondary mt-1">Real-time dashboard overview</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchStats}
                disabled={statsLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-primary/10 text-brand.primary rounded-lg hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {statsLoading ? 'Updating...' : 'Refresh'}
              </button>
              <div className="text-xs text-brand.secondary">
                {lastUpdated ? (
                  `Updated ${lastUpdated.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh'
                  })}`
                ) : (
                  "Loading..."
                )}
              </div>
            </div>
          </div>

          {statsError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">Failed to load statistics</p>
                  <p className="text-xs text-red-600 mt-1">{statsError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Primary Metrics */}
            <div className="lg:col-span-2 bg-gradient-to-br from-brand-primary/10 via-brand-primary/5 to-transparent rounded-xl p-6 border border-brand-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand.dark">Total Products</h3>
                    <p className="text-xs text-brand.secondary">Active products in store</p>
                  </div>
                </div>
              </div>
              <div className="text-4xl font-bold text-brand-primary">
                {statsLoading ? (
                  <div className="animate-pulse bg-brand-primary/20 h-10 w-16 rounded"></div>
                ) : (
                  stats?.totalProducts?.toLocaleString() ?? "--"
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                All active products
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand.dark">Total Users</h3>
                    <p className="text-xs text-brand.secondary">Registered customers</p>
                  </div>
                </div>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {statsLoading ? (
                  <div className="animate-pulse bg-blue-500/20 h-10 w-16 rounded"></div>
                ) : (
                  stats?.totalUsers?.toLocaleString() ?? "--"
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-blue-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified accounts
              </div>
            </div>

            {/* Order Metrics */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl p-6 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand.dark">Orders Today</h3>
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {statsLoading ? (
                  <div className="animate-pulse bg-emerald-500/20 h-6 w-12 rounded"></div>
                ) : (
                  stats?.ordersToday ?? "--"
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-emerald-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                +12% from yesterday
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent rounded-xl p-6 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand.dark">Pending Orders</h3>
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? (
                  <div className="animate-pulse bg-orange-500/20 h-6 w-12 rounded"></div>
                ) : (
                  stats?.pendingOrders ?? "--"
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-orange-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Requires attention
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand.dark">Total Orders</h3>
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? (
                  <div className="animate-pulse bg-purple-500/20 h-6 w-12 rounded"></div>
                ) : (
                  stats?.totalOrders?.toLocaleString() ?? "--"
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-purple-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                +8% this month
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
