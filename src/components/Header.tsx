"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getGuestCartCount } from "@/lib/guestCart";
import {
  MdShoppingCart,
  MdPerson,
  MdLogout,
  MdMessage,
  MdMenu,
  MdClose,
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
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      if (!target.closest(".mobile-menu")) setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ====== Merge Guest Cart into User Cart after login ======
  const mergeGuestCartToUser = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token || !user) return;

    // Đọc guest cart trực tiếp từ localStorage để tránh phụ thuộc vào state / hook
    try {
      const raw = localStorage.getItem("guest_cart_v1");
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        items?: { productId: string; quantity: number; size?: string | null }[];
        mergedOnce?: boolean;
      };

      // Nếu không có items hoặc đã merge trước đó thì bỏ qua
      if (!parsed.items || parsed.items.length === 0 || parsed.mergedOnce) return;

      // Lần lượt push từng item lên /api/cart (upsert)
      for (const item of parsed.items) {
        if (!item || !item.productId || !item.quantity || item.quantity <= 0) continue;

        try {
          await fetch("/api/cart", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              size: item.size ?? null,
            }),
          });
        } catch {
          // Nếu 1 item lỗi, bỏ qua item đó, tiếp tục các item khác để không chặn toàn bộ merge
          continue;
        }
      }

      // Đánh dấu đã merge và xoá items để tránh merge lại
      const mergedSnapshot = {
        items: [],
        lastUpdated: new Date().toISOString(),
        mergedOnce: true,
      };
      localStorage.setItem("guest_cart_v1", JSON.stringify(mergedSnapshot));

      // Cập nhật lại count từ server
      await fetchCartItemCountFromServer();
      // Thông báo cho các component khác
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      }
    } catch {
      // Nếu parse lỗi, xoá luôn guest cart để tránh lặp lỗi
      localStorage.removeItem("guest_cart_v1");
    }
  };

  // ====== Fetch Cart Count (server-first, fallback guest) ======
  const fetchCartItemCountFromServer = async () => {
    if (typeof window === "undefined") {
      setCartItemCount(0);
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (token && user) {
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
          return;
        }
      } catch {
        // nếu lỗi sẽ fallback xuống guest
      }
    }
    // fallback guest
    const guestCount = getGuestCartCount();
    setCartItemCount(guestCount);
  };

  const fetchCartItemCount = async () => {
    await fetchCartItemCountFromServer();
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
    // Khi state user thay đổi:
    // - Nếu vừa có user + token: thực hiện merge guest cart -> user cart một lần.
    // - Sau đó luôn fetch lại cart count.
    const run = async () => {
      if (user && typeof window !== "undefined") {
        await mergeGuestCartToUser();
      }
      await fetchCartItemCount();
      if (user) {
        await fetchUnreadCount();
        await fetchRecentConversations();
      } else {
        setUnreadCount(0);
        setRecentConversations([]);
      }
    };
    run();

    const handleCartUpdate = () => {
      fetchCartItemCount();
    };

    const handleMessageUpdate = () => {
      if (user) {
        fetchUnreadCount();
        fetchRecentConversations();
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    window.addEventListener("messageUpdated", handleMessageUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
      window.removeEventListener("messageUpdated", handleMessageUpdate);
    };
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
       <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
         {/* ====== Mobile Menu Button + Logo ====== */}
         <div className="flex items-center gap-2">
           {/* Mobile Menu Button */}
           <button
             onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
             className="md:hidden p-2 text-brand-dark hover:text-brand-primary transition-colors min-w-[44px] min-h-[44px]"
             aria-label="Toggle mobile menu"
           >
             {mobileMenuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
           </button>
 
           {/* Logo */}
           <Link href="/" className="flex items-center gap-2">
             <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 overflow-hidden">
               <img
                 src="/AIFShop.svg"
                 alt="AIFShop Logo"
                 className="h-16 w-16 sm:h-18 sm:w-18 object-contain align-middle"
               />
             </div>
             <span className="font-bold text-lg sm:text-xl text-brand-dark leading-none">
               AIFShop
             </span>
           </Link>
         </div>

         {/* ====== Desktop Menu ====== */}
         <nav className="hidden md:flex items-center gap-6 text-sm text-brand-dark font-medium relative">
           <Link
             href="/"
             className={`${baseCls} ${isActive("/") ? activeCls : ""}`}
             aria-current={isActive("/") ? "page" : undefined}
           >
             Trang chủ
           </Link>

           <Link
             href="/shop"
             className={`${baseCls} ${isActive("/shop") ? activeCls : ""}`}
             aria-current={isActive("/shop") ? "page" : undefined}
           >
             Sản phẩm
           </Link>

           <Link
             href="/about"
             className={`${baseCls} ${isActive("/about") ? activeCls : ""}`}
             aria-current={isActive("/about") ? "page" : undefined}
           >
             Thông tin
           </Link>

           <Link
             href="/cart"
             className={`${baseCls} ${isActive("/cart") ? activeCls : ""} flex items-center gap-1 relative`}
             aria-current={isActive("/cart") ? "page" : undefined}
           >
             <MdShoppingCart className="w-4 h-4" />
             Giỏ hàng
             {cartItemCount > 0 && (
               <span className="absolute -top-2 -right-5 bg-brand-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                 {cartItemCount > 99 ? "99+" : cartItemCount}
               </span>
             )}
           </Link>
         </nav>

        {/* ====== Search + Auth ====== */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Search - Show on all pages except home */}
          {pathname !== "/" && (
            <div className="md:hidden block">
              <SearchBar variant="navbar" />
            </div>
          )}

          {/* Desktop Search - Hide on Home and Search pages */}
          {pathname !== "/" && pathname !== "/search" && (
            <div className="hidden md:block">
              <SearchBar variant="navbar" />
            </div>
          )}

          {/* Cart Icon - chỉ dùng bản trong menu desktop; icon riêng này đã được gỡ để tránh trùng lặp */}

          {/* Messages */}
          {mounted && user && (
            <div className="relative message-menu">
              <button
                onClick={() => setMessageDropdownOpen(!messageDropdownOpen)}
                className="flex items-center gap-2 text-brand-dark hover:text-brand-primary p-2 sm:p-1 relative min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                aria-label="Messages"
              >
                <MdMessage className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {messageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-brand-light rounded-lg shadow-lg z-50 message-menu max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-brand-light">
                    <h3 className="text-sm font-medium text-brand-dark">
                      Tin nhắn
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
                        Không có tin nhắn gần đây
                      </div>
                    )}
                  </div>

                  <div className="border-t border-brand-light">
                    <Link
                      href="/messenger"
                      className="flex items-center justify-center w-full px-4 py-3 text-sm text-brand-primary hover:bg-brand-light/50"
                      onClick={() => setMessageDropdownOpen(false)}
                    >
                      Xem tất cả tin nhắn
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth */}
          {mounted && (
            <div className="flex items-center gap-2 sm:gap-3 text-sm">
              {user ? (
                <div className="relative user-menu">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-brand-dark hover:text-brand-primary p-2 sm:p-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                    aria-label="User menu"
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
                        Thông tin cá nhân
                      </Link>
                      <Link
                        href="/orders"
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <MdShoppingCart className="w-4 h-4" />
                        Đơn hàng
                      </Link>
                      {userRole === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <MdPerson className="w-4 h-4" />
                          Quản lý
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-brand-dark hover:bg-brand-light/50"
                      >
                        <MdLogout className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-brand-dark hover:text-brand-primary min-h-[44px] flex items-center px-2"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-2 min-h-[44px] bg-brand-primary text-white hover:opacity-90 flex items-center text-sm"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ====== Mobile Menu Overlay ====== */}
      {mobileMenuOpen && (
        <div className="mobile-menu fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-brand-light">
                <span className="font-semibold text-brand-dark">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-brand-dark hover:text-brand-primary"
                  aria-label="Close menu"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Menu Navigation */}
              <nav className="flex-1 px-4 py-6">
                <div className="space-y-4">
                  <Link
                    href="/"
                    className={`block py-3 px-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive("/") ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-light"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Trang chủ
                  </Link>

                  <Link
                    href="/shop"
                    className={`block py-3 px-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive("/shop") ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-light"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sản phẩm
                  </Link>

                  <Link
                    href="/about"
                    className={`block py-3 px-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive("/about") ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-light"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Thông tin
                  </Link>

                  <Link
                    href="/cart"
                    className={`flex items-center gap-3 py-3 px-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive("/cart") ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-light"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MdShoppingCart className="w-5 h-5" />
                    Giỏ hàng
                    {cartItemCount > 0 && (
                      <span className="bg-red-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center font-medium">
                        {cartItemCount > 99 ? "99+" : cartItemCount}
                      </span>
                    )}
                  </Link>
                </div>

                {/* User Actions in Mobile Menu */}
                <div className="mt-8 pt-6 border-t border-brand-light">
                  {user ? (
                    <div className="space-y-3">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 py-3 px-4 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <MdPerson className="w-5 h-5" />
                        Thông tin cá nhân
                      </Link>

                      <Link
                        href="/orders"
                        className="flex items-center gap-3 py-3 px-4 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <MdShoppingCart className="w-5 h-5" />
                        Đơn hàng
                      </Link>

                      {userRole === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 py-3 px-4 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <MdPerson className="w-5 h-5" />
                          Quản lý
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 py-3 px-4 rounded-lg text-brand-dark hover:bg-brand-light transition-colors w-full text-left"
                      >
                        <MdLogout className="w-5 h-5" />
                        Đăng xuất
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link
                        href="/login"
                        className="block py-3 px-4 rounded-lg text-center bg-brand-primary text-white font-medium hover:opacity-90 transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Đăng nhập
                      </Link>
                      <Link
                        href="/register"
                        className="block py-3 px-4 rounded-lg text-center border border-brand-primary text-brand-primary font-medium hover:bg-brand-primary hover:text-white transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Đăng ký
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
