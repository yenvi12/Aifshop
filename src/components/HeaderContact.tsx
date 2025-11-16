"use client";

import Link from "next/link";
import { MdSearch, MdShoppingCart, MdPhoneInTalk } from "react-icons/md";

type Props = {
  phone?: string;           // Số điện thoại hiển thị
  onSearch?: (q: string) => void;
};

export default function HeaderContact({ phone = "+89789123456", onSearch }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-brand-light border-b-2 border-brand-accent/80">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary grid place-items-center text-white font-bold text-lg">
            A
          </div>
          <span className="text-brand-dark font-bold text-lg">AIFShop</span>
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-6 text-brand-dark font-medium">
          <Link href="/" className="hover:text-brand-primary">Home</Link>
          <Link href="/shop" className="hover:text-brand-primary">Shop</Link>
          <Link href="/about" className="hover:text-brand-primary">About Us</Link>
          <Link href="/contact" className="hover:text-brand-primary">Contact</Link>
        </nav>

        {/* Spacer để đẩy cụm search/phone sang phải */}
        <div className="flex-1" />

        {/* Cart icon */}
        <Link href="/cart" className="hidden sm:inline-flex text-brand-dark hover:text-brand-primary">
          <MdShoppingCart className="w-5 h-5" />
        </Link>

        {/* Search box */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm trên trang"
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSearch) onSearch((e.target as HTMLInputElement).value);
            }}
            className="w-56 md:w-64 rounded-lg border border-brand-secondary/50 bg-white px-3 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
          <MdSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary w-4 h-4" />
        </div>

        {/* Phone */}
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          className="hidden sm:inline-flex items-center gap-2 text-brand-dark hover:text-brand-primary"
        >
          <MdPhoneInTalk className="w-5 h-5" />
          <span className="font-medium">{phone}</span>
        </a>
      </div>
    </header>
  );
}
