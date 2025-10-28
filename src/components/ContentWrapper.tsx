'use client';

import { usePathname } from 'next/navigation';

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that manage their own spacing/layout (full-width pages)
  const fullWidthPages = ['/', '/shop', '/about'];
  
  // If it's a full-width page, render children directly
  if (fullWidthPages.includes(pathname)) {
    return <>{children}</>;
  }
  
  // Otherwise, wrap with container padding for other pages
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
      {children}
    </div>
  );
}

