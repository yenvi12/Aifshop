'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

export default function HeaderWrapper() {
  const pathname = usePathname();
  const hideHeaderPaths = ['/login', '/register'];

  if (hideHeaderPaths.includes(pathname)) {
    return null;
  }

  return <Header />;
}