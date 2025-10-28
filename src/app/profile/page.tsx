"use client";

import Link from "next/link";
import Section from "@/components/ui/Section";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MdKeyboardArrowRight,
  MdChevronRight,
  MdKeyboardArrowDown,
  MdEdit,
  MdPayment,
  MdSecurity,
  MdHistory,
  MdLocationOn,
  MdShoppingCart,
  MdStyle,
} from "react-icons/md";
import { supabase } from "@/lib/supabase";
import EditProfileModal, { ProfileForm } from "@/components/profile/EditProfileModal";
import type { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";

/* ===== Helper: safe image src ===== */
function safeImageSrc(src?: string | null) {
  if (!src) return null;
  const s = String(src).trim();
  if (s === "") return null;
  return s;
}

export default function ProfilePage() {
  const router = useRouter();
  const [openPayments, setOpenPayments] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ProfileForm | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.access_token) {
        await fetchProfile(session.access_token);
      } else {
        router.push('/login');
      }
    };
    getSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuộn mượt tới section theo id
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/profile#${id}`);
    }
  };

  // Nếu truy cập /profile#addresses (hoặc hash khác) thì tự cuộn sau khi load xong
  useEffect(() => {
    if (!loading && typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.slice(1);
      requestAnimationFrame(() => scrollToId(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser({
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          birthday: data.birthday ? new Date(data.birthday) : null,
          bio: data.bio || '',
          avatar: data.avatar && String(data.avatar).trim() !== '' ? data.avatar : null,
          stylePreferences: data.stylePreferences || [],
          defaultAddress: data.defaultAddress || { shipping: '', billing: '' }
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (updatedProfile: ProfileForm) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...updatedProfile,
          birthday: updatedProfile.birthday ? updatedProfile.birthday.toISOString().split('T')[0] : '',
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update user state immediately with API response data (convert '' -> null)
        setUser({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          birthday: data.user.birthday ? new Date(data.user.birthday) : null,
          bio: data.user.bio || '',
          avatar: data.user.avatar && String(data.user.avatar).trim() !== '' ? data.user.avatar : null,
          stylePreferences: data.user.stylePreferences || [],
          defaultAddress: data.user.defaultAddress || { shipping: '', billing: '' }
        });
        toast.success(data.message || 'Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!user) return <div>Please log in</div>;

  return (
    <main className="min-h-screen bg-white text-brand-dark scroll-smooth">
      <div className="h-4" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="sr-only">Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-brand-accent bg-brand-light/50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-brand-secondary/10">
                  {safeImageSrc(user.avatar) ? (
                    <img
                      src={safeImageSrc(user.avatar) as string}
                      alt={user.name || "avatar"}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center bg-brand-secondary/20 text-white font-semibold">
                      {getInitials(user.name)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-brand-secondary">{user.email}</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700 text-xs">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Verified
                  </div>
                </div>
              </div>
            </div>

            <nav className="mt-4 space-y-2">
              <MenuItem active onClick={() => scrollToId("profile")}>Profile</MenuItem>
              <MenuItem icon={<MdLocationOn />} onClick={() => scrollToId("addresses")}>Addresses</MenuItem>
              <MenuItem icon={<MdPayment />} onClick={() => scrollToId("payments")}>Payments</MenuItem>
              <MenuItem icon={<MdShoppingCart />} onClick={() => router.push("/orders")}>Orders & Preorders</MenuItem>
              <div className="pt-3 border-t border-brand-accent" />
            </nav>
          </aside>

          {/* Right */}
          <section className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="flex items-center gap-2">
                {/* Edit mở modal */}
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Personal information — READ ONLY */}
            <div id="profile" className="scroll-mt-24">
              <Section title="Personal information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ViewField label="Full name" value={user.name} />
                  <ViewField label="Email" value={user.email} />
                  <ViewField label="Phone" value={user.phone || '-'} />
                  <ViewField label="Birthday" value={user.birthday ? user.birthday.toLocaleDateString('en-CA') : '-'} />
                </div>
                <div className="mt-3">
                  <ViewField label="Bio" value={user.bio || '-'} full />
                </div>
              </Section>
            </div>

            {/* Style preferences */}
            <div id="style" className="scroll-mt-24">
              <Section title="Style preferences">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {user.stylePreferences.length > 0 ? (
                    user.stylePreferences.map((t) => <Tag key={t}>{t}</Tag>)
                  ) : (
                    <span className="text-sm text-brand-secondary">No preferences yet</span>
                  )}
                </div>
              </Section>
            </div>

            {/* Default address */}
            <div id="addresses" className="scroll-mt-24">
              <Section title="Default address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ViewField label="Shipping address" value={user.defaultAddress.shipping || '-'} />
                  <ViewField label="Billing address" value={user.defaultAddress.billing || '-'} />
                </div>
              </Section>
            </div>

            {/* Payment methods */}
            <div id="payments" className="scroll-mt-24">
              <Section
                title="Payment methods"
                right={
                  <button
                    className="text-brand-secondary hover:text-brand-primary inline-flex items-center gap-1"
                    onClick={() => setOpenPayments((v) => !v)}
                  >
                    {openPayments ? <>Hide <MdKeyboardArrowDown className="h-4 w-4" /></> : <>Show <MdChevronRight className="h-4 w-4" /></>}
                  </button>
                }
              >
                {openPayments && (
                  <div className="space-y-2">
                    <AccordionRow title="Stripe • Visa **** 4242" />
                    <AccordionRow title="VNPAY" />
                    <AccordionRow title="MoMo Wallet" />
                  </div>
                )}
              </Section>
            </div>

            {/* Recent activity */}
            <div id="activity" className="scroll-mt-24">
              <Section
                title="Recent activity"
                right={
                  <button
                    className="text-brand-secondary hover:text-brand-primary inline-flex items-center gap-1"
                    onClick={() => setOpenRecent((v) => !v)}
                  >
                    {openRecent ? <>Hide <MdKeyboardArrowDown className="h-4 w-4" /></> : <>Show <MdChevronRight className="h-4 w-4" /></>}
                  </button>
                }
              >
                {openRecent && (
                  <div className="space-y-3">
                    <ActivityRow
                      id="#PRE-1987"
                      title="Linen Blazer — Preorder"
                      meta="Authorized on Stripe • ETA 10–15 days"
                      statusLabel="Confirmed"
                      statusColor="bg-emerald-100 text-emerald-700"
                      img="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=120&auto=format&fit=crop"
                    />
                    <ActivityRow
                      id="#REQ-2031"
                      title="Silk Scarf — Quote"
                      meta="Awaiting approval • Reply before Jul 5, 2025"
                      statusLabel="Pending"
                      statusColor="bg-amber-100 text-amber-700"
                      img="https://images.unsplash.com/photo-1520975922284-8b456906c813?q=80&w=120&auto=format&fit=crop"
                    />
                    <ActivityRow
                      id="#ORD-3312"
                      title="Utility Cotton Jacket"
                      meta="Shipped • VNPost • Tracking VN12345"
                      statusLabel="In transit"
                      statusColor="bg-indigo-100 text-indigo-700"
                      img="https://images.unsplash.com/photo-1520975693412-35c8c1f84f49?q=80&w=120&auto=format&fit=crop"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button className="inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60">
                        <MdHistory className="h-4 w-4" /> View all activity
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-xl bg-amber-100 text-amber-800 px-3 py-1.5 text-sm hover:bg-amber-200">
                        Browse recommendations
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            </div>

            {/* Security (đặt id nếu muốn cuộn tới) */}
            <div id="security" className="scroll-mt-24">
              {/* Bạn có thể thêm Section "Security" riêng ở đây nếu có nội dung */}
            </div>

            <div className="pt-4 text-xs text-center text-brand-secondary">
              <p>
                © 2025 AIFShop. All rights reserved. • <Link href="#" className="hover:text-brand-primary">Privacy Policy</Link> •{" "}
                <Link href="#" className="hover:text-brand-primary">Terms of Service</Link>
              </p>
            </div>
          </section>
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        initial={user}
        onClose={() => setEditOpen(false)}
        onSave={async (val) => {
          await handleSaveProfile(val);
          setEditOpen(false);
        }}
      />
    </main>
  );
}

/* ---------- Helpers & small UI bits ---------- */

function getInitials(name?: string | null) {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return initials;
}

/* ViewField: hiển thị label + value (read-only).
   Nếu full=true hiển thị block; mặc định hiển thị inline.
*/
function ViewField({ label, value, full = false }: { label: string; value?: string | null; full?: boolean; }) {
  return (
    <div className={full ? "" : ""}>
      <span className="mb-1 block text-xs text-brand-secondary">{label}</span>
      <div className={`w-full rounded-xl border border-brand-accent bg-white px-3 py-2 text-sm ${full ? "min-h-[56px]" : ""}`}>
        <div className="text-sm text-brand-dark">{value ?? '-'}</div>
      </div>
    </div>
  );
}

function MenuItem({
  children,
  icon,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/15 border border-transparent",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        {icon && <span className="text-brand-secondary">{icon}</span>}
        {children}
      </span>
      <MdKeyboardArrowRight className="h-4 w-4 opacity-70" />
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-xl bg-brand-dark/20 text-brand-dark px-3 py-1 text-xs">{children}</span>;
}

function AccordionRow({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-accent px-3 py-2 text-sm">
      <span>{title}</span>
      <button className="inline-flex items-center gap-1 text-brand-secondary hover:text-brand-primary">
        <MdEdit className="h-4 w-4" /> Edit
      </button>
    </div>
  );
}

function ActivityRow({
  id,
  title,
  meta,
  statusLabel,
  statusColor,
  img,
}: {
  id: string;
  title: string;
  meta: string;
  statusLabel: string;
  statusColor: string;
  img?: string | null;
}) {
  const imgSrc = safeImageSrc(img);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-accent p-3">
      <div className="relative h-12 w-12 overflow-hidden rounded-xl flex-shrink-0 bg-brand-secondary/10">
        {imgSrc ? (
          <img src={imgSrc} alt={title} className="object-cover w-full h-full" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-brand-dark/60">No image</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{id}: {title}</p>
        <p className="text-xs text-brand-secondary truncate">{meta}</p>
      </div>
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${statusColor}`}>{statusLabel}</span>
    </div>
  );
}
