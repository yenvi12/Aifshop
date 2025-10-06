"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MdSearch, MdShoppingCart, MdPerson, MdLogout } from "react-icons/md";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await getUserSession(sessionUser);
        } else {
          setUserRole(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    );

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setDropdownOpen(false);
    router.push('/');
  };

  const getUserSession = async (sessionUser: User) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            localStorage.setItem('accessToken', result.tokens.accessToken);
            localStorage.setItem('refreshToken', result.tokens.refreshToken);
            setUserRole(result.user.role);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get user session:', error);
    }
  };
  return (
    <header className="sticky top-0 z-50 bg-brand-light shadow-sm border-b border-brand-accent">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="font-bold text-lg text-brand-dark">AIFShop</span>
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-brand-dark font-medium">
          <Link href="/" className="hover:text-brand-primary">Home</Link>
          <Link href="/shop" className="hover:text-brand-primary">Shop</Link>
          <Link href="/about" className="hover:text-brand-primary">About Us</Link>
          <Link href="/contact" className="hover:text-brand-primary">Contact</Link>
          <Link href="/cart" className="hover:text-brand-primary flex items-center gap-1">
            <MdShoppingCart className="w-4 h-4" />
            Cart
          </Link>
        </nav>

        {/* Search + Auth */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search in site"
              className="w-52 rounded-lg border border-brand-secondary/40 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <MdSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary w-4 h-4" />
          </div>

          {/* Auth */}
          {mounted && (
            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <div className="relative user-menu">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-brand-dark hover:text-brand-primary p-1"
                  >
                    <MdPerson className="w-5 h-5" />
                  </button>

                  {dropdownOpen && (
  <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-light rounded-lg shadow-lg z-50 user-menu">
    <Link
      href="/profile"
      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
      onClick={() => setDropdownOpen(false)}
    >
      <MdPerson className="w-4 h-4" />
      Profile
    </Link>
    {userRole === 'ADMIN' && (
      <Link
        href="/admin"
        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
        onClick={() => setDropdownOpen(false)}
      >
        <MdPerson className="w-4 h-4" />
        Admin Panel
      </Link>
    )}
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
    >
      <MdLogout className="w-4 h-4" />
      Logout
    </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-brand-dark hover:text-brand-primary">Sign in</Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-1.5 bg-brand-primary text-white hover:opacity-90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
