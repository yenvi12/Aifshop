"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MdOutlineCalendarToday } from "react-icons/md";
import toast from "react-hot-toast";

export type ProfileForm = {
   name: string;
   email: string;
   phone: string;
   birthday: Date | null;
   bio: string;
   avatar: string;
   stylePreferences: string[];
   defaultAddress: {
     shipping: string;
     billing: string;
   };
};

const STYLE_OPTIONS = ["Neutral colors", "Relaxed fit", "Natural fabrics", "Capsule wardrobe", "Minimalist", "Vintage", "Bohemian", "Streetwear"];

export default function EditProfileModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ProfileForm;
  onClose: () => void;
  onSave: (val: ProfileForm) => void;
}) {
  const [form, setForm] = useState<ProfileForm>(initial);
  const [uploading, setUploading] = useState(false);

  const handleChange =
    (k: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleStyleToggle = (style: string) => {
    setForm((s) => ({
      ...s,
      stylePreferences: s.stylePreferences.includes(style)
        ? s.stylePreferences.filter((p) => p !== style)
        : [...s.stylePreferences, style]
    }));
  };

  const handleAddressChange = (type: 'shipping' | 'billing') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((s) => ({
      ...s,
      defaultAddress: { ...s.defaultAddress, [type]: e.target.value }
    }));
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((s) => ({ ...s, avatar: url }));
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl border border-brand-accent">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Edit profile</h3>
          <button onClick={onClose} className="text-brand-secondary hover:text-brand-primary">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[128px,1fr] gap-4">
          {/* Avatar */}
          <div>
            <div className="relative h-32 w-32 rounded-2xl overflow-hidden border border-brand-accent">
              <img src={form.avatar} alt="avatar" className="object-cover w-full h-full" />
            </div>
            <label className="mt-2 inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm cursor-pointer hover:bg-brand-light/60">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
              />
              {uploading ? "Uploading…" : "Change avatar"}
            </label>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <L label="Full name">
              <I defaultValue={form.name} onChange={handleChange("name")} />
            </L>
            <L label="Email">
              <I defaultValue={form.email} onChange={handleChange("email")} />
            </L>
            <L label="Phone">
              <I defaultValue={form.phone} onChange={handleChange("phone")} />
            </L>
            <L label="Birthday">
              <div className="relative">
                <DatePicker
                  selected={form.birthday}
                  onChange={(date) => setForm((s) => ({ ...s, birthday: date }))}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select your birthday"
                  className="w-full rounded-xl border border-brand-accent bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={50}
                  scrollableYearDropdown
                  maxDate={new Date()}
                />
                <MdOutlineCalendarToday className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary w-5 h-5 pointer-events-none" />
              </div>
            </L>
            <L label="Bio" className="md:col-span-2">
              <textarea
                className="w-full rounded-xl border border-brand-accent bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40"
                rows={3}
                defaultValue={form.bio}
                onChange={handleChange("bio")}
              />
            </L>
          </div>

          {/* Style preferences */}
          <div className="mt-4">
            <span className="mb-2 block text-xs text-brand-secondary">Style preferences</span>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleStyleToggle(style)}
                  className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    form.stylePreferences.includes(style)
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-accent bg-white text-brand-dark hover:bg-brand-light/60'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Default address */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <L label="Shipping address">
              <I defaultValue={form.defaultAddress.shipping} onChange={handleAddressChange('shipping')} />
            </L>
            <L label="Billing address">
              <I defaultValue={form.defaultAddress.billing} onChange={handleAddressChange('billing')} />
            </L>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-xl bg-brand-primary text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-brand-secondary">{label}</span>
      {children}
    </label>
  );
}
function I(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-brand-accent bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40 ${props.className ?? ""}`}
    />
  );
}

async function uploadToCloudinary(file: File): Promise<string> {
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string; // unsigned preset
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.secure_url as string;
}
