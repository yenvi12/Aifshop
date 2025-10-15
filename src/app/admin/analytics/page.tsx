"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Breadcrumb from "@/components/ui/Breadcrumb";
import {
  MdRefresh,
  MdTrendingUp,
  MdTrendingDown,
  MdAnalytics,
  MdDownload,
  MdDateRange,
  MdShowChart,
  MdPieChart,
  MdBarChart,
  MdTimeline,
  MdFilterList
} from "react-icons/md";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  // Basic stats
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  ordersToday: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;

  // Trends
  revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
  userGrowth: Array<{ date: string; users: number }>;
  ordersByStatus: Array<{ status: string; count: number; percentage: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number; orders: number }>;

  // Comparisons
  trends: {
    revenue: { change: number; direction: 'up' | 'down' | 'neutral' };
    orders: { change: number; direction: 'up' | 'down' | 'neutral' };
    users: { change: number; direction: 'up' | 'down' | 'neutral' };
    aov: { change: number; direction: 'up' | 'down' | 'neutral' };
  };
}

type DateRange = '7d' | '30d' | '90d' | '1y';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async (range: DateRange = dateRange) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setRefreshing(true);

    try {
      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch analytics:', result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

        await fetchAnalytics();
      } catch {
        router.push("/login");
      }
    };

    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics(dateRange);
    }
  }, [dateRange]);

  const handleExport = () => {
    if (!data) return;

    const csvData = [
      ['Metric', 'Value', 'Trend'],
      ['Total Revenue', `${(data.totalRevenue).toLocaleString('vi-VN')}₫`, `${data.trends.revenue.change > 0 ? '+' : ''}${data.trends.revenue.change}%`],
      ['Total Orders', data.totalOrders, `${data.trends.orders.change > 0 ? '+' : ''}${data.trends.orders.change}%`],
      ['Total Users', data.totalUsers, `${data.trends.users.change > 0 ? '+' : ''}${data.trends.users.change}%`],
      ['Average Order Value', `${data.averageOrderValue.toLocaleString('vi-VN')}₫`, `${data.trends.aov.change > 0 ? '+' : ''}${data.trends.aov.change}%`],
      ['Conversion Rate', `${data.conversionRate.toFixed(1)}%`, ''],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}₫`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value}%`;

  const chartColors = {
    primary: '#1f2937',
    secondary: '#3b82f6',
    accent: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899'
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand.light/60 to-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand.primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-brand.secondary">Loading analytics...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand.light/60 to-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand.dark mb-2">
              Store Analytics
            </h1>
            <p className="text-brand.secondary">
              Comprehensive insights into your store performance
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <MdDateRange className="w-5 h-5 text-brand.secondary" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-2 border border-brand.light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary bg-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <MdDownload className="w-4 h-4" />
              Export CSV
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAnalytics()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              <MdRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-sm text-brand.secondary mb-6">
            Last updated: {format(lastUpdated, 'HH:mm:ss dd/MM/yyyy')}
          </div>
        )}

        {/* KPI Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Revenue */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <MdTrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  data.trends.revenue.direction === 'up' ? 'text-green-600' :
                  data.trends.revenue.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.trends.revenue.direction === 'up' && <MdTrendingUp className="w-4 h-4" />}
                  {data.trends.revenue.direction === 'down' && <MdTrendingDown className="w-4 h-4" />}
                  {formatPercentage(data.trends.revenue.change)}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.totalRevenue)}
              </div>
            </div>

            {/* Orders */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <MdBarChart className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  data.trends.orders.direction === 'up' ? 'text-green-600' :
                  data.trends.orders.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.trends.orders.direction === 'up' && <MdTrendingUp className="w-4 h-4" />}
                  {data.trends.orders.direction === 'down' && <MdTrendingDown className="w-4 h-4" />}
                  {formatPercentage(data.trends.orders.change)}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
              <div className="text-3xl font-bold text-gray-900">
                {data.totalOrders.toLocaleString()}
              </div>
            </div>

            {/* Users */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <MdAnalytics className="w-6 h-6 text-purple-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  data.trends.users.direction === 'up' ? 'text-green-600' :
                  data.trends.users.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.trends.users.direction === 'up' && <MdTrendingUp className="w-4 h-4" />}
                  {data.trends.users.direction === 'down' && <MdTrendingDown className="w-4 h-4" />}
                  {formatPercentage(data.trends.users.change)}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
              <div className="text-3xl font-bold text-gray-900">
                {data.totalUsers.toLocaleString()}
              </div>
            </div>

            {/* AOV */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <MdPieChart className="w-6 h-6 text-orange-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  data.trends.aov.direction === 'up' ? 'text-green-600' :
                  data.trends.aov.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.trends.aov.direction === 'up' && <MdTrendingUp className="w-4 h-4" />}
                  {data.trends.aov.direction === 'down' && <MdTrendingDown className="w-4 h-4" />}
                  {formatPercentage(data.trends.aov.change)}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Average Order Value</h3>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.averageOrderValue)}
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <div className="flex items-center gap-2 mb-6">
              <MdShowChart className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-brand.dark">Revenue Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.revenueTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString('vi-VN')}₫`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${value.toLocaleString('vi-VN')}₫`, 'Revenue']}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartColors.secondary}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by Status */}
          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <div className="flex items-center gap-2 mb-6">
              <MdPieChart className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-brand.dark">Orders by Status</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }: any) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data?.ordersByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={[
                        chartColors.accent,
                        chartColors.warning,
                        chartColors.danger,
                        chartColors.secondary,
                        chartColors.purple
                      ][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <div className="flex items-center gap-2 mb-6">
              <MdBarChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-brand.dark">Top Products</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.topProducts.slice(0, 5)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [value, 'Sales']}
                />
                <Bar dataKey="sales" fill={chartColors.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth */}
          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <div className="flex items-center gap-2 mb-6">
              <MdTimeline className="w-5 h-5 text-pink-600" />
              <h2 className="text-xl font-semibold text-brand.dark">User Growth</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [value, 'New Users']}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke={chartColors.pink}
                  strokeWidth={3}
                  dot={{ fill: chartColors.pink, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: chartColors.pink, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <h3 className="text-lg font-semibold text-brand.dark mb-4">Orders Today</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data?.ordersToday || 0}
            </div>
            <p className="text-sm text-brand.secondary">Orders placed today</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <h3 className="text-lg font-semibold text-brand.dark mb-4">Pending Orders</h3>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {data?.pendingOrders || 0}
            </div>
            <p className="text-sm text-brand.secondary">Orders awaiting processing</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-brand.light p-6">
            <h3 className="text-lg font-semibold text-brand.dark mb-4">Conversion Rate</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {data?.conversionRate.toFixed(1) || 0}%
            </div>
            <p className="text-sm text-brand.secondary">Visitors to customers</p>
          </div>
        </div>
      </div>
    </main>
  );
}