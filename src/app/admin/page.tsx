"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { MdAdd, MdInventory, MdPeople, MdAnalytics } from "react-icons/md";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has admin access
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Decode token to check role (simple check, in production use proper JWT verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setUser({
          id: payload.userId,
          email: payload.email,
          firstName: 'Admin',
          lastName: 'User',
          role: payload.role
        });
      } catch (error) {
        console.error('Invalid token');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-light/30">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-brand-secondary">Loading admin panel...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const adminActions = [
    {
      title: "Add Product",
      description: "Create new products for your store",
      icon: MdAdd,
      href: "/admin/add-product",
      color: "bg-blue-500"
    },
    {
      title: "Manage Products",
      description: "Edit or remove existing products",
      icon: MdInventory,
      href: "/admin/products",
      color: "bg-green-500"
    },
    {
      title: "User Management",
      description: "View and manage user accounts",
      icon: MdPeople,
      href: "/admin/users",
      color: "bg-purple-500"
    },
    {
      title: "Analytics",
      description: "View store analytics and reports",
      icon: MdAnalytics,
      href: "/admin/analytics",
      color: "bg-orange-500"
    }
  ];

  return (
    <main className="min-h-screen bg-brand-light/30">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Admin Panel</h1>
          <p className="text-brand-secondary">Manage your AIFShop store</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white rounded-2xl p-6 shadow-sm border border-brand-light hover:shadow-md transition-shadow group"
            >
              <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-brand-dark mb-2">{action.title}</h3>
              <p className="text-sm text-brand-secondary">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity or Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-light p-6">
          <h2 className="text-xl font-semibold text-brand-dark mb-4">Quick Stats</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">--</div>
              <p className="text-brand-secondary">Total Products</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">--</div>
              <p className="text-brand-secondary">Total Users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">--</div>
              <p className="text-brand-secondary">Total Orders</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}