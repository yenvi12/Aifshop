"use client";

import Link from "next/link";
import { useState } from "react";
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
import EditProfileModal, { ProfileForm } from "@/components/profile/EditProfileModal";
import Header from "@/components/Header";

export default function ProfilePage() {
  const router = useRouter();
  const [openPayments, setOpenPayments] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const [user, setUser] = useState<ProfileForm>({
    name: "Jane Nguyen",
    email: "jane@aifshop.com",
    phone: "+84 903 246 098",
    birthday: "May 12, 1996",
    bio: "Sustainable fashion enthusiast. I love minimal fits and neutral palettes.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
  });

  return (
    <main className="min-h-screen bg-white text-brand-dark">
      <div className="h-4" />
      <Header></Header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="sr-only">Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-brand-accent bg-brand-light/50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden">
                  <img src={user.avatar} alt={user.name} className="object-cover w-full h-full" loading="lazy" />
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
              <MenuItem active onClick={() => router.push("/profile")}>Profile</MenuItem>
              <MenuItem icon={<MdLocationOn />} onClick={() => router.push("/profile/addresses")}>Addresses</MenuItem>
              <MenuItem icon={<MdPayment />} onClick={() => router.push("/profile/payments")}>Payments</MenuItem>
              <MenuItem icon={<MdShoppingCart />} onClick={() => router.push("/orders")}>Orders & Preorders</MenuItem>
              <MenuItem icon={<MdStyle />} onClick={() => router.push("/profile/preferences")}>Quotes</MenuItem>
              <MenuItem icon={<MdSecurity />} onClick={() => router.push("/profile/security")}>Security</MenuItem>

              <div className="pt-3 border-t border-brand-accent" />
              <div className="rounded-2xl border border-brand-accent bg-brand-light/40 p-3">
                <p className="text-sm font-medium mb-2">Need help?</p>
                <div className="space-y-2">
                  <ActionButton onClick={() => setEditOpen(true)}>Edit</ActionButton>
                  <ActionButton variant="secondary" onClick={() => router.push("/contact")}>Contact support</ActionButton>
                  <p className="text-[11px] text-brand-secondary">We usually reply within 2 hours.</p>
                </div>
              </div>
            </nav>
          </aside>

          {/* Right */}
          <section className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60">
                  Edit
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-3 py-1.5 text-sm hover:opacity-90">
                  Save changes
                </button>
              </div>
            </div>

            {/* Personal information */}
            <Section title="Personal information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Full name" defaultValue={user.name} />
                <Field label="Email" defaultValue={user.email} />
                <Field label="Phone" defaultValue={user.phone} />
                <Field label="Birthday" defaultValue={user.birthday} />
              </div>
              <Field label="Bio" defaultValue={user.bio} className="mt-3" />
            </Section>

            {/* Style preferences */}
            <Section title="Style preferences">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {["Neutral colors", "Relaxed fit", "Natural fabrics", "Capsule wardrobe"].map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </Section>

            {/* Default address */}
            <Section title="Default address">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Shipping address" defaultValue="12 Nguyen Trai, District 1, HCMC" />
                <Field label="Billing address" defaultValue="Same as shipping" />
              </div>
            </Section>

            {/* Payment methods */}
            <Section
              title="Payment methods"
              right={
                <button className="text-brand-secondary hover:text-brand-primary inline-flex items-center gap-1" onClick={() => setOpenPayments((v) => !v)}>
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

            {/* Recent activity */}
            <Section
              title="Recent activity"
              right={
                <button className="text-brand-secondary hover:text-brand-primary inline-flex items-center gap-1" onClick={() => setOpenRecent((v) => !v)}>
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
        onSave={(val) => {
          setUser(val);
          setEditOpen(false);
        }}
      />
    </main>
  );
}

/* ---------- small UI bits ---------- */
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

function ActionButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-xl px-3 py-2 text-sm border",
        variant === "primary" ? "bg-brand-primary text-white border-brand-primary hover:opacity-90" : "bg-white text-brand-dark border-brand-accent hover:bg-brand-light/60",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-accent bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-accent text-[10px] text-brand-secondary">•</span>
          <h3 className="font-medium">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, defaultValue, className }: { label: string; defaultValue?: string; className?: string }) {
  return (
    <label className={["block", className].filter(Boolean).join(" ")}>
      <span className="mb-1 block text-xs text-brand-secondary">{label}</span>
      <input className="w-full rounded-xl border border-brand-accent bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40" defaultValue={defaultValue} />
    </label>
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
  img: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-accent p-3">
      <div className="relative h-12 w-12 overflow-hidden rounded-xl flex-shrink-0">
        <img src={img} alt={title} className="object-cover w-full h-full" loading="lazy" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{id}: {title}</p>
        <p className="text-xs text-brand-secondary truncate">{meta}</p>
      </div>
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${statusColor}`}>{statusLabel}</span>
    </div>
  );
}
