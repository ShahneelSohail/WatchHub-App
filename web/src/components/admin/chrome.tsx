'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PageMeta {
  title: string;
  crumb: string;
}

interface ChromeValue {
  setMeta: (meta: PageMeta | null) => void;
  actionSlot: HTMLElement | null;
}

export const ChromeContext = createContext<ChromeValue>({ setMeta: () => undefined, actionSlot: null });

export const usePageMeta = (title: string | undefined, crumb: string) => {
  const { setMeta } = useContext(ChromeContext);
  const pathname = usePathname();
  useEffect(() => {
    setMeta(title ? { title, crumb } : null);
    return () => setMeta(null);
  }, [setMeta, title, crumb, pathname]);
};

export const TopbarAction = ({ children }: { children: ReactNode }) => {
  const { actionSlot } = useContext(ChromeContext);
  return actionSlot ? createPortal(children, actionSlot) : null;
};

export const useSearchTerm = (): string => (useSearchParams().get('q') ?? '').trim();
