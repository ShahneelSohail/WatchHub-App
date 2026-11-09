'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BagDrawer } from './BagDrawer';
import { CommandPalette } from './CommandPalette';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { StoreUiProvider } from './StoreUi';
import { cx } from './ui';

const SELF_WRAPPED = /^(\/|\/watches(\/.*)?|\/search)$/;

export const StoreShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  return (
    <StoreUiProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className={cx('flex-1', !SELF_WRAPPED.test(pathname) && 'wrap py-6 pb-16 md:py-8')}>{children}</main>
        <Footer />
      </div>
      <BagDrawer />
      <CommandPalette />
    </StoreUiProvider>
  );
};
