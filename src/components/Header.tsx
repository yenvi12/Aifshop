"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MdSearch, MdShoppingCart, MdPerson, MdLogout, MdMessage } from "react-icons/md";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { isTokenExpired } from "@/lib/tokenManager";

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
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const authRequestIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);

    // Check authentication from both localStorage and Supabase session
    const checkAuth = async () => {
      const requestId = ++authRequestIdRef.current;

      // First, check JWT token from localStorage
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          // Expiry check first for consistency
          if (isTokenExpired(token)) {
            if (authRequestIdRef.current !== requestId) return;
            setUser(null);
            setUserRole(null);

            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return;
          }

          // Decode JWT payload (simple decode, not verify)
          const payload = JSON.parse(atob(token.split(".")[1]));
          // Create mock user object from payload
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
        } catch (error) {
          // Invalid token - clear and redirect to login
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);

          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // If no localStorage token, check Supabase session (for Google OAuth)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Create session tokens for Google OAuth users
            try {
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                }
              });

              const sessionData = await response.json();
              if (authRequestIdRef.current !== requestId) return;
              if (sessionData.success) {
                localStorage.setItem('accessToken', sessionData.tokens.accessToken);
                localStorage.setItem('refreshToken', sessionData.tokens.refreshToken);
                setUser(session.user);
                // Use role from sessionData.user, not from tokens (tokens do not include role)
                setUserRole(sessionData.user?.role || null);
              } else {
                // Do not force USER on failure; keep role unchanged
                setUser(session.user);
                // Optionally: setUserRole(null);
              }
            } catch (error) {
              // If session creation fails, still use Supabase user but don't override role
              if (authRequestIdRef.current !== requestId) return;
              setUser(session.user);
              // Optionally: setUserRole(null);
            }
          } else {
            if (authRequestIdRef.current !== requestId) return;
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
        }
      }
    };

    checkAuth();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-menu")) {
        setDropdownOpen(false);
      }
      if (!target.closest(".message-menu")) {
        setMessageDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen for auth state changes from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const requestId = ++authRequestIdRef.current;

      if (event === 'SIGNED_IN' && session?.user) {
        // Handle Google OAuth sign in
        try {
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          const sessionData = await response.json();
          if (authRequestIdRef.current !== requestId) return;
          if (sessionData.success) {
            localStorage.setItem('accessToken', sessionData.tokens.accessToken);
            localStorage.setItem('refreshToken', sessionData.tokens.refreshToken);
            setUser(session.user);
            // Use role from sessionData.user; do not default to USER on failure
            setUserRole(sessionData.user?.role || null);
          } else {
            setUser(session.user);
            // Do not override role to USER here
          }
        } catch (error) {
          if (authRequestIdRef.current !== requestId) return;
          setUser(session.user);
          // Do not override role to USER here
        }
      } else if (event === 'SIGNED_OUT') {
        if (authRequestIdRef.current !== requestId) return;
        setUser(null);
        setUserRole(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to fetch cart item count
  const fetchCartItemCount = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) {
      setCartItemCount(0);
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Calculate total quantity of all items in cart
        const totalCount = data.data.reduce((total: number, item: any) => total + item.quantity, 0);
        setCartItemCount(totalCount);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartItemCount(0);
    }
  };

  // Function to fetch unread message count
  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch('/api/conversations/unread-count', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Unread count response:', data);

      if (data.success && data.data) {
        const newCount = data.data.unreadCount;
        console.log('Setting unread count to:', newCount, 'for user:', user.id);
        setUnreadCount(newCount);
        // Cache in localStorage
        localStorage.setItem('unreadMessageCount', newCount.toString());
      } else {
        console.log('Invalid unread count response:', data);
        setUnreadCount(0);
        localStorage.setItem('unreadMessageCount', '0');
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  // Function to fetch recent conversations
  const fetchRecentConversations = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) {
      setRecentConversations([]);
      return;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setRecentConversations(data.data.slice(0, 10)); // Limit to 10 recent conversations
      } else {
        setRecentConversations([]);
      }
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      setRecentConversations([]);
    }
  };

  // Listen for cart updates
  useEffect(() => {
    if (user) {
      fetchCartItemCount();

      // Listen for cart update events
      const handleCartUpdate = () => {
        fetchCartItemCount();
      };

      window.addEventListener('cartUpdated', handleCartUpdate);

      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdate);
      };
    } else {
      setCartItemCount(0);
    }
  }, [user]);

  // Listen for message updates with real-time + polling
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchRecentConversations();

      // Listen for message update events
      const handleMessageUpdate = () => {
        fetchUnreadCount();
        fetchRecentConversations();
      };

      window.addEventListener('messageUpdated', handleMessageUpdate);

      // Real-time listener for messages sent TO current user
      const realtimeChannel = supabase
        .channel(`messages-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiverId=eq.${user.id}`,
        }, (payload) => {
          console.log('Real-time: New message for user:', payload);
          fetchUnreadCount();
          fetchRecentConversations();
          window.dispatchEvent(new CustomEvent('messageReceived'));
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiverId=eq.${user.id}`,
        }, (payload) => {
          console.log('Real-time: Message updated for user:', payload);
          fetchUnreadCount();
          fetchRecentConversations();
        })
        .subscribe();

      // Polling for cross-user notifications (always poll regardless of tab visibility)
      const pollInterval = setInterval(() => {
        console.log('Polling for unread count updates...');
        fetchUnreadCount();
      }, 10000); // Faster polling for testing

      // Also poll conversations less frequently
      const conversationPollInterval = setInterval(() => {
        console.log('Polling for conversation updates...');
        fetchRecentConversations();
      }, 20000);

      return () => {
        window.removeEventListener('messageUpdated', handleMessageUpdate);
        supabase.removeChannel(realtimeChannel);
        clearInterval(pollInterval);
        clearInterval(conversationPollInterval);
      };
    } else {
      setUnreadCount(0);
      setRecentConversations([]);
    }
  }, [user]);

  // Refresh auth on route change
  useEffect(() => {
    const checkAuth = async () => {
      const requestId = ++authRequestIdRef.current;

      // First, check JWT token from localStorage
      const token = localStorage.getItem("accessToken");
      if (token) {
        // Check if token is expired and redirect if needed
        if (isTokenExpired(token)) {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return;
        }

        try {
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
        } catch (error) {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      } else {
        // If no localStorage token, check Supabase session (for Google OAuth)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Create session tokens for Google OAuth users
            try {
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                }
              });

              const sessionData = await response.json();
              if (authRequestIdRef.current !== requestId) return;
              if (sessionData.success) {
                localStorage.setItem('accessToken', sessionData.tokens.accessToken);
                localStorage.setItem('refreshToken', sessionData.tokens.refreshToken);
                setUser(session.user);
                setUserRole(sessionData.user?.role || null);
              } else {
                setUser(session.user);
                // Do not override role to USER here
              }
            } catch (error) {
              if (authRequestIdRef.current !== requestId) return;
              // If session creation fails, still use Supabase user but don't override role
              setUser(session.user);
            }
          } else {
            if (authRequestIdRef.current !== requestId) return;
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          if (authRequestIdRef.current !== requestId) return;
          setUser(null);
          setUserRole(null);
        }
      }
    };

    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("unreadMessageCount");
    setDropdownOpen(false);
    router.push("/");
  };

  // Function to format relative time
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-light shadow-sm border-b border-brand-accent">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center h-10 w-10 overflow-hidden">
            <img
              src="/AIFShop.svg"
              alt="AIFShop Logo"
              className="h-18 w-18 object-contain align-middle"
            />
          </div>
          <span className="font-bold text-xl text-brand-dark leading-none">AIFShop</span>
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-brand-dark font-medium">
          <Link href="/" className="hover:text-brand-primary">
            Home
          </Link>
          <Link href="/shop" className="hover:text-brand-primary">
            Shop
          </Link>
          <Link href="/about" className="hover:text-brand-primary">
            About Us
          </Link>
          <Link href="/contact" className="hover:text-brand-primary">
            Contact
          </Link>
          <Link
            href="/cart"
            className="hover:text-brand-primary flex items-center gap-1 relative"
          >
            <MdShoppingCart className="w-4 h-4" />
            Cart
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-5 bg-brand-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
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
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {messageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-brand-light rounded-lg shadow-lg z-50 message-menu max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-brand-light">
                    <h3 className="text-sm font-medium text-brand-dark">Messages</h3>
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
                              <div className="w-6 h-6 text-brand-secondary">📦</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-brand-dark truncate">
                                {conversation.product?.name || 'Product'}
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