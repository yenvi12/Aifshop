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

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        <section className="rounded-2xl border border-brand.light bg-white shadow-smooth p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-brand.dark">
              Quick Stats
            </h2>
            <div className="text-xs text-brand.secondary">
              Updated just now
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              { label: "Total Products" },
              { label: "Total Users" },
              { label: "Total Orders" },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-brand.light/70 bg-gradient-to-br from-white to-brand.light/40 p-5 text-center hover:shadow-smooth transition-shadow"
              >
                <div className="text-3xl font-bold tracking-tight text-brand.primary">
                  --
                </div>
                <p className="mt-1 text-sm text-brand.secondary">{s.label}</p>
              </div>
            ))}
            {/* Orders Stats */}
            {[
              { label: "Total Orders" },
              { label: "Orders Today" },
              { label: "Pending Orders" },
            ].map((s, i) => (
              <div
                key={i + 3}
                className="rounded-xl border border-brand.light/70 bg-gradient-to-br from-white to-brand.light/40 p-5 text-center hover:shadow-smooth transition-shadow"
              >
                <div className="text-3xl font-bold tracking-tight text-brand.primary">
                  --
                </div>
                <p className="mt-1 text-sm text-brand.secondary">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
