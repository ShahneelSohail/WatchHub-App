'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface StoreUiState {
  bagOpen: boolean;
  searchOpen: boolean;
  couponCode: string | null;
  openBag: () => void;
  closeBag: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setCouponCode: (code: string | null) => void;
}

const StoreUiContext = createContext<StoreUiState | null>(null);

export const useStoreUi = (): StoreUiState => {
  const context = useContext(StoreUiContext);
  if (!context) throw new Error('useStoreUi must be used within StoreUiProvider');
  return context;
};

export const StoreUiProvider = ({ children }: { children: ReactNode }) => {
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setBagOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const openBag = useCallback(() => {
    setSearchOpen(false);
    setBagOpen(true);
  }, []);
  const closeBag = useCallback(() => setBagOpen(false), []);
  const openSearch = useCallback(() => {
    setBagOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
      if (event.key === 'Escape') {
        setBagOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  useEffect(() => {
    document.body.style.overflow = bagOpen || searchOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [bagOpen, searchOpen]);

  const value = useMemo(() => ({ bagOpen, searchOpen, couponCode, openBag, closeBag, openSearch, closeSearch, setCouponCode }), [bagOpen, searchOpen, couponCode, openBag, closeBag, openSearch, closeSearch]);
  return <StoreUiContext.Provider value={value}>{children}</StoreUiContext.Provider>;
};
