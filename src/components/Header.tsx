"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MdShoppingCart,
  MdPerson,
  MdLogout,
  MdMessage,
} from "react-icons/md";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { isTokenExpired } from "@/lib/tokenManager";
import SearchBar from "@/components/SearchBar";

// Define TypeScript interfaces
interface ConversationData {
  conversationId: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    slug: string;
  } | null;
  lastMessage: {
    content: string;
    timestamp: Date;
    sender: {
      id?: string;
      firstName: string | null;
      lastName: string | null;
      supabaseUserId: string | null;
      role?: string;
    };
    senderId: string;
    receiverId: string;
  };
  unreadCount: number;
  messageCount: number;
}

interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  size: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image: string | null;
    images: string[];
    stock: number;
    sizes: {
      name: string;
      stock: number;
    }[] | null;
    badge: string | null;
    slug: string;
  };
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState<number>(0);
  const [messageDropdownOpen, setMessageDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentConversations, setRecentConversations] = useState<ConversationData[]>([]);
  const authRequestIdRef = useRef(0);

  // ====== Highlight active link ======
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const activeCls =
    "text-brand-primary font-semibold relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-brand-primary";
  const baseCls = "hover:text-brand-primary";

  // ====== Initial Auth Check ======
  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      const requestId = ++authRequestIdRef.current;

      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          if (isTokenExpired(token)) {
            if (authRequestIdRef.current !== requestId) return;
            setUser(null);
            setUserRole(null);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            if (window.location.pathname !== "/login")
              window.location.href = "/login";
            return;
          }

          const payload = JSON.parse(atob(token.split(".")[1]));
          const mockUser: User = {
            id: payload.userId,
            email: payload.email,
            user_metadata: {},
            app_metadata: {},
            aud: "",
            created_at: "",
            updated_at: "",
          };
          if (authRequestIdRef.current !== requestId) return;
          setUser(mockUser);
          setUserRole(payload.role);
        } catch {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          if (window.location.pathname !== "/login")
            window.location.href = "/login";
        }
      } else {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            try {
              const response = await fetch("/api/auth/session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
              const sessionData = await response.json();
              if (authRequestIdRef.current !== requestId) return;
              if (sessionData.success) {
                localStorage.setItem(
                  "accessToken",
                  sessionData.tokens.accessToken
                );
                localStorage.setItem(
                  "refreshToken",
                  sessionData.tokens.refreshToken
                );
                setUser(session.user);
                setUserRole(sessionData.user?.role || 'USER');
              } else {
                // Even if session creation fails, set user to enable logout
                setUser(session.user);
                setUserRole(null);
              }
            } catch {
              if (authRequestIdRef.current !== requestId) return;
              // Even if session creation fails, set user to enable logout
              setUser(session.user);
              setUserRole(null);
            }
          } else {
            if (authRequestIdRef.current !== requestId) return;
            setUser(null);
            setUserRole(null);
          }
        } catch {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
        }
      }
    };

    checkAuth();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-menu")) setDropdownOpen(false);
      if (!target.closest(".message-menu")) setMessageDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ====== Fetch Cart Count ======
  const fetchCartItemCount = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) {
      setCartItemCount(0);
      return;
    }

    try {
      const response = await fetch("/api/cart", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success && data.data) {
        const total = data.data.reduce(
          (sum: number, item: CartItem) => sum + item.quantity,
          0
        );
        setCartItemCount(total);
      } else {
        setCartItemCount(0);
      }
    } catch {
      setCartItemCount(0);
    }
  };

  // ====== Fetch Unread Message Count ======
  const fetchUnreadCount = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch("/api/conversations/unread-count", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.data.unreadCount);
      } else {
        setUnreadCount(0);
      }
    } catch {
      setUnreadCount(0);
    }
  };

  // ====== Fetch Recent Conversations ======
  const fetchRecentConversations = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) {
      setRecentConversations([]);
      return;
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        // Take only first 5 recent conversations
        setRecentConversations(data.data.slice(0, 5));
      } else {
        setRecentConversations([]);
      }
    } catch {
      setRecentConversations([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCartItemCount();
      fetchUnreadCount();
      fetchRecentConversations();

      const handleCartUpdate = () => fetchCartItemCount();
      const handleMessageUpdate = () => {
        fetchUnreadCount();
        fetchRecentConversations();
      };

      window.addEventListener("cartUpdated", handleCartUpdate);
      window.addEventListener("messageUpdated", handleMessageUpdate);

      return () => {
        window.removeEventListener("cartUpdated", handleCartUpdate);
        window.removeEventListener("messageUpdated", handleMessageUpdate);
      };
    } else {
      setCartItemCount(0);
      setUnreadCount(0);
      setRecentConversations([]);
    }
  }, [user]);

  // ====== Logout ======
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("unreadMessageCount");
    setUnreadCount(0);
    setRecentConversations([]);
    setDropdownOpen(false);
    router.push("/");
  };

  // ====== Format time helper ======
  const formatTime = (timestamp: string | Date) => {
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffMin = Math.floor(
      (now.getTime() - msgTime.getTime()) / (1000 * 60)
    );
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return `${Math.floor(diffMin / 1440)}d`;
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-head shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* ====== Logo ====== */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center h-10 w-10 overflow-hidden">
            <img
              src="/AIFShop.svg"
              alt="AIFShop Logo"
              className="h-18 w-18 object-contain align-middle"
            />
          </div>
          <span className="font-bold text-xl text-brand-dark leading-none">
            AIFShop
          </span>
        </Link>

        {/* ====== Menu ====== */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-brand-dark font-medium relative">
          <Link
            href="/"
            className={`${baseCls} ${isActive("/") ? activeCls : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>

          <Link
            href="/shop"
            className={`${baseCls} ${isActive("/shop") ? activeCls : ""}`}
            aria-current={isActive("/shop") ? "page" : undefined}
          >
            Shop
          </Link>

          <Link
            href="/about"
            className={`${baseCls} ${isActive("/about") ? activeCls : ""}`}
            aria-current={isActive("/about") ? "page" : undefined}
          >
            About Us
          </Link>

          <Link
            href="/cart"
            className={`${baseCls} ${isActive("/cart") ? activeCls : ""} flex items-center gap-1 relative`}
            aria-current={isActive("/cart") ? "page" : undefined}
          >
            <MdShoppingCart className="w-4 h-4" />
            Cart
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-5 bg-brand-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>
        </nav>

        {/* ====== Search + Auth ====== */}
        <div className="flex items-center gap-4">
          {/* Search - Hide on Home and Search pages */}
          {pathname !== "/" && pathname !== "/search" && (
            <div className="hidden sm:block">
              <SearchBar variant="navbar" />
            </div>
          )}

          {/* Messages */}
          {mounted && user && (
            <div className="relative message-menu">
              <button
                onClick={() => setMessageDropdownOpen(!messageDropdownOpen)}
                className="flex items-center gap-2 text-brand-dark hover:text-brand-primary p-1 relative"
              >
                <MdMessage className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {messageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-brand-light rounded-lg shadow-lg z-50 message-menu max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-brand-light">
                    <h3 className="text-sm font-medium text-brand-dark">
                      Messages
                    </h3>
                  </div>

                  <div className="py-2">
                    {recentConversations.length > 0 ? (
                      recentConversations.map((conversation) => (
                        <Link
                          key={conversation.conversationId}
                          href={`/messenger/${conversation.conversationId}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-brand-light/50 cursor-pointer"
                          onClick={() => setMessageDropdownOpen(false)}
                        >
                          <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {conversation.product?.image ? (
                              <img
                                src={conversation.product.image}
                                alt={conversation.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 text-brand-secondary">
                                📦
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-brand-dark truncate">
                                {conversation.product?.name || "Product"}
                              </p>
                              <span className="text-xs text-brand-secondary">
                                {formatTime(conversation.lastMessage.timestamp)}
                              </span>
                            </div>

                            <p className="text-sm text-brand-secondary truncate mt-1">
                              {conversation.lastMessage.content}
                            </p>

                            {conversation.unreadCount > 0 && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-brand-primary text-white text-xs rounded-full">
                                {conversation.unreadCount} new
                              </span>
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-brand-secondary text-center">
                        No recent messages
                      </div>
                    )}
                  </div>

                  <div className="border-t border-brand-light">
                    <Link
                      href="/messenger"
                      className="flex items-center justify-center w-full px-4 py-3 text-sm text-brand-primary hover:bg-brand-light/50"
                      onClick={() => setMessageDropdownOpen(false)}
                    >
                      View All Messages
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      <Link
                        href="/orders"
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <MdShoppingCart className="w-4 h-4" />
                        Orders
                      </Link>
                      {userRole === "ADMIN" && (
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
                  <Link
                    href="/login"
                    className="text-brand-dark hover:text-brand-primary"
                  >
                    Sign in
                  </Link>
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
