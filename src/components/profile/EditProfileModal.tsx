"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MdOutlineCalendarToday } from "react-icons/md";
import toast from "react-hot-toast";

export type AddressForm = {
  id?: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string;
  label?: string;
  isDefault?: boolean;
};

export type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  birthday: Date | null;
  bio: string;
  avatar: string | null;
  stylePreferences: string[];
  addresses: AddressForm[];
};

const STYLE_OPTIONS = [
  "Neutral colors",
  "Relaxed fit",
  "Natural fabrics",
  "Capsule wardrobe",
  "Minimalist",
  "Vintage",
  "Bohemian",
  "Streetwear",
];

/* Helper: return null if src is empty-like */
function safeImageSrc(src?: string | null) {
  if (!src) return null;
  const s = String(src).trim();
  if (s === "") return null;
  return s;
}

function getInitials(name?: string | null) {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return initials;
}

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
  // local form state
  const [form, setForm] = useState<ProfileForm>(() => ({
    name: "",
    email: "",
    phone: "",
    birthday: null,
    bio: "",
    avatar: null,
    stylePreferences: [],
    addresses: [],
  }));
  const [uploading, setUploading] = useState(false);

  // Sync initial -> form whenever modal opens or initial changes
  useEffect(() => {
    if (open && initial) {
      // clone initial safely (avoid linking references)
      setForm({
        name: initial.name ?? "",
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        birthday: initial.birthday ? new Date(initial.birthday) : null,
        bio: initial.bio ?? "",
        avatar: initial.avatar ?? null,
        stylePreferences: Array.isArray(initial.stylePreferences) ? [...initial.stylePreferences] : [],
        addresses: Array.isArray(initial.addresses) ? [...initial.addresses] : [],
      });

      // reset any native file inputs if present
      const mainImageInput = document.querySelector<HTMLInputElement>("#edit-avatar-input");
      if (mainImageInput) mainImageInput.value = "";
    }
  }, [open, initial]);

  // Lock background scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Controlled input handlers
  const handleChange =
    (k: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [k]: (e.target as HTMLInputElement).value }));

  // Address management functions
  const addAddress = () => {
    const newAddress: AddressForm = {
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      postalCode: '',
      phone: '',
      label: '',
      isDefault: false,
    };
    setForm(s => ({ ...s, addresses: [...s.addresses, newAddress] }));
  };

  const updateAddress = (index: number, field: keyof AddressForm, value: string | boolean) => {
    setForm(s => ({
      ...s,
      addresses: s.addresses.map((addr, i) =>
        i === index ? { ...addr, [field]: value } : addr
      ),
    }));
  };

  const removeAddress = (index: number) => {
    setForm(s => ({
      ...s,
      addresses: s.addresses.filter((_, i) => i !== index),
    }));
  };

  const setDefaultAddress = (index: number) => {
    setForm(s => ({
      ...s,
      addresses: s.addresses.map((addr, i) => ({
        ...addr,
        isDefault: i === index,
      })),
    }));
  };

  const handleStyleToggle = (style: string) => {
    setForm((s) => ({
      ...s,
      stylePreferences: s.stylePreferences.includes(style)
        ? s.stylePreferences.filter((p) => p !== style)
        : [...s.stylePreferences, style],
    }));
  };

  // Handle avatar upload (Cloudinary)
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

  // Remove avatar locally
  const handleRemoveAvatar = () => {
    setForm((s) => ({ ...s, avatar: null }));
  };

  // Save
  const handleSave = () => {
    if (uploading) {
      toast.error("Please wait for upload to finish");
      return;
    }
    // small validation (you can expand)
    if (!form.name.trim()) {
      toast.error("Full name required");
      return;
    }
    onSave(form);
  };

  if (!open) return null;

  return (
    // overlay: allow overlay/page scroll if modal taller than viewport
    <div
      className="fixed inset-0 z-[60] bg-black/40 p-4 overflow-auto flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      {/* spacer to center with top padding */}
      <div className="min-h-[100vh] w-full flex items-start justify-center py-8">
        {/* modal box */}
        <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-brand-accent shadow-xl overflow-hidden max-h-[calc(100vh-4rem)]">
          {/* header (outside scroll area) */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 id="edit-profile-title" className="text-base font-semibold">
              Edit profile
            </h3>
          </div>

          {/* body (scrollable) */}
          <div className="p-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="grid grid-cols-1 md:grid-cols-[128px,1fr] gap-4">
              {/* Avatar */}
              <div>
                <div className="relative h-32 w-32 rounded-2xl overflow-hidden border border-brand-accent bg-brand-secondary/10">
                  {safeImageSrc(form.avatar) ? (
                    <img src={safeImageSrc(form.avatar) as string} alt="avatar" className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-white font-semibold text-xl bg-brand-secondary/30">
                      {getInitials(form.name)}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm cursor-pointer hover:bg-brand-light/60 w-fit">
                    <input
                      id="edit-avatar-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
                    />
                    {uploading ? "Uploading…" : "Change avatar"}
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60 w-fit"
                  >
                    Remove avatar
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <L label="Full name">
                  <I value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                </L>

                <L label="Email">
                  <I value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                </L>

                <L label="Phone">
                  <I value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
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
                    value={form.bio}
                    onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
                  />
                </L>
              </div>

              {/* Style preferences */}
              <div className="mt-4 md:col-span-2">
                <span className="mb-2 block text-xs text-brand-secondary">Style preferences</span>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => handleStyleToggle(style)}
                      className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                        form.stylePreferences.includes(style)
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-brand-accent bg-white text-brand-dark hover:bg-brand-light/60"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Addresses */}
              <div className="mt-4 md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Addresses</span>
                  <button
                    type="button"
                    onClick={addAddress}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-primary bg-brand-primary text-white px-3 py-1.5 text-sm hover:opacity-90"
                  >
                    + Add Address
                  </button>
                </div>

                <div className="space-y-3">
                  {form.addresses.map((addr, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="defaultAddress"
                            checked={addr.isDefault || false}
                            onChange={() => setDefaultAddress(index)}
                            className="text-brand-primary"
                          />
                          <span className="text-sm font-medium">
                            {addr.label || `Address ${index + 1}`}
                            {addr.isDefault && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-brand-primary text-white">
                                Default
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <L label="Label">
                          <I
                            value={addr.label || ''}
                            onChange={(e) => updateAddress(index, 'label', e.target.value)}
                            placeholder="e.g. Home, Work"
                          />
                        </L>
                        <div></div>
                        <L label="First Name">
                          <I
                            value={addr.firstName}
                            onChange={(e) => updateAddress(index, 'firstName', e.target.value)}
                          />
                        </L>
                        <L label="Last Name">
                          <I
                            value={addr.lastName}
                            onChange={(e) => updateAddress(index, 'lastName', e.target.value)}
                          />
                        </L>
                        <L label="Address">
                          <I
                            value={addr.address}
                            onChange={(e) => updateAddress(index, 'address', e.target.value)}
                            placeholder="Street address"
                          />
                        </L>
                        <L label="City">
                          <I
                            value={addr.city}
                            onChange={(e) => updateAddress(index, 'city', e.target.value)}
                          />
                        </L>
                        <L label="Postal Code">
                          <I
                            value={addr.postalCode}
                            onChange={(e) => updateAddress(index, 'postalCode', e.target.value)}
                          />
                        </L>
                        <L label="Phone">
                          <I
                            value={addr.phone || ''}
                            onChange={(e) => updateAddress(index, 'phone', e.target.value)}
                          />
                        </L>
                      </div>
                    </div>
                  ))}

                  {form.addresses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No addresses added yet. Click &quot;Add Address&quot; to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* footer (kept outside scroll area) */}
          <div className="p-4 border-t flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-brand-accent px-3 py-1.5 text-sm hover:bg-brand-light/60">
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="rounded-xl bg-brand-primary text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? "Please wait..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small UI helpers */
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

/* Cloudinary upload util (kept same) */
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
