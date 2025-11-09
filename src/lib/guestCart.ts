"use client";

import Cookies from "js-cookie";

export interface GuestCartItem {
  productId: string;
  quantity: number;
  size?: string | null;
  addedAt: string;
}

export interface GuestCartData {
  items: GuestCartItem[];
  lastUpdated: string;
  mergedOnce?: boolean;
}

const STORAGE_KEY = "guest_cart_v1";
const GUEST_ID_COOKIE = "guestCartId";
const MAX_AGE_DAYS = 30;

/**
 * Ensure operations only run in browser.
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get or create a guestCartId cookie for tracking (optional usage).
 */
export function ensureGuestId(): string | null {
  if (!isBrowser()) return null;
  let id = Cookies.get(GUEST_ID_COOKIE);
  if (!id) {
    id = crypto.randomUUID();
    Cookies.set(GUEST_ID_COOKIE, id, {
      expires: MAX_AGE_DAYS,
      sameSite: "Lax",
    });
  }
  return id;
}

/**
 * Load guest cart from localStorage, auto-clean if invalid or expired.
 */
export function loadGuestCart(): GuestCartData {
  if (!isBrowser()) {
    return { items: [], lastUpdated: new Date().toISOString() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    const data = JSON.parse(raw) as GuestCartData;
    if (!data.items || !Array.isArray(data.items) || !data.lastUpdated) {
      localStorage.removeItem(STORAGE_KEY);
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    // TTL check
    const last = new Date(data.lastUpdated).getTime();
    const now = Date.now();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_AGE_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    return {
      items: data.items.filter((i) => i && i.productId && i.quantity > 0),
      lastUpdated: data.lastUpdated,
      mergedOnce: data.mergedOnce ?? false,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { items: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Persist guest cart to localStorage.
 */
export function saveGuestCart(cart: GuestCartData): void {
  if (!isBrowser()) return;

  const hasItems = Array.isArray(cart.items) && cart.items.some((i) => i && i.productId && i.quantity > 0);

  // Khi có items mới ở chế độ guest, đây được xem là "batch" mới:
  // - Luôn reset mergedOnce về false để batch mới sẽ được merge ở lần đăng nhập kế tiếp.
  // - Điều này xử lý đúng case:
  //   + Lần 1: guest -> merge -> mergedOnce = true, items = []
  //   + Sau đó user logout, thêm giỏ guest mới -> mergedOnce phải trở lại false.
  const normalized: GuestCartData = {
    items: hasItems
      ? cart.items.filter((i) => i && i.productId && i.quantity > 0)
      : [],
    lastUpdated: new Date().toISOString(),
    mergedOnce: hasItems ? false : cart.mergedOnce ?? false,
  };

  if (!hasItems) {
    // Không còn item nào: nếu trước đó đã merge thì giữ mergedOnce để tránh batch cũ;
    // nếu không, xoá hẳn key.
    if (!normalized.mergedOnce) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

/**
 * Add or increase item in guest cart.
 */
export function addGuestCartItem(input: {
  productId: string;
  quantity?: number;
  size?: string | null;
}): GuestCartData {
  if (!isBrowser()) {
    return { items: [], lastUpdated: new Date().toISOString() };
  }

  ensureGuestId();
  const { productId } = input;
  const delta = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const sizeKey = input.size ?? null;

  const cart = loadGuestCart();
  const idx = cart.items.findIndex(
    (i) => i.productId === productId && (i.size ?? null) === sizeKey
  );

  if (idx >= 0) {
    cart.items[idx].quantity += delta;
  } else {
    cart.items.push({
      productId,
      quantity: delta,
      size: sizeKey,
      addedAt: new Date().toISOString(),
    });
  }

  saveGuestCart(cart);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  }
  return cart;
}

/**
 * Update quantity, remove if quantity <= 0.
 */
export function updateGuestCartItem(input: {
  productId: string;
  quantity: number;
  size?: string | null;
}): GuestCartData {
  if (!isBrowser()) {
    return { items: [], lastUpdated: new Date().toISOString() };
  }

  const sizeKey = input.size ?? null;
  const cart = loadGuestCart();
  const idx = cart.items.findIndex(
    (i) => i.productId === input.productId && (i.size ?? null) === sizeKey
  );

  if (idx >= 0) {
    if (input.quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = input.quantity;
    }
  }

  saveGuestCart(cart);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  }
  return cart;
}

/**
 * Remove an item.
 */
export function removeGuestCartItem(input: {
  productId: string;
  size?: string | null;
}): GuestCartData {
  if (!isBrowser()) {
    return { items: [], lastUpdated: new Date().toISOString() };
  }

  const sizeKey = input.size ?? null;
  const cart = loadGuestCart();
  const filtered = cart.items.filter(
    (i) => !(i.productId === input.productId && (i.size ?? null) === sizeKey)
  );
  const next: GuestCartData = {
    ...cart,
    items: filtered,
  };
  saveGuestCart(next);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  }
  return next;
}

/**
 * Clear all guest cart data.
 */
export function clearGuestCart(options?: { keepGuestId?: boolean; markMerged?: boolean }): void {
  if (!isBrowser()) return;

  if (options?.markMerged) {
    const existing = loadGuestCart();
    const marked: GuestCartData = {
      items: [],
      lastUpdated: new Date().toISOString(),
      mergedOnce: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marked));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }

  if (!options?.keepGuestId) {
    Cookies.remove(GUEST_ID_COOKIE);
  }

  window.dispatchEvent(new CustomEvent("cartUpdated"));
}

/**
 * Count total quantity in guest cart.
 */
export function getGuestCartCount(): number {
  const cart = loadGuestCart();
  return cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
}

/**
 * Mark that merge has been attempted/performed (to avoid duplicate merges).
 */
export function markGuestCartMerged(): void {
  if (!isBrowser()) return;
  const cart = loadGuestCart();
  const updated: GuestCartData = {
    ...cart,
    items: [],
    mergedOnce: true,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("cartUpdated"));
}

/**
 * Check if guest cart has already been merged once (helper for login flow).
 */
export function hasGuestCartMerged(): boolean {
  const cart = loadGuestCart();
  return !!cart.mergedOnce;
}