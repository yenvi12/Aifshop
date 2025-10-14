import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-brand-light border-t border-brand-accent py-6 text-xs text-brand-secondary">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <p>© 2025 AIFShop. All rights reserved.</p>
        <div className="flex items-center flex-wrap gap-4 text-center">
          <a href="#" className="hover:text-brand-primary">Privacy Policy</a>
          <a href="#" className="hover:text-brand-primary">Terms of Service</a>
          <a href="mailto:Aifshop@gmail.com" className="hover:text-brand-primary">Email: Aifshop@gmail.com</a>
          <Link href="/about" className="hover:text-brand-primary">About Us</Link>
        </div>
      </div>
    </footer>
  );
}
