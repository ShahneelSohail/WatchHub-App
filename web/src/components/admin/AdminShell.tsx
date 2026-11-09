'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { withQuery } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { useAuth } from '../Providers';
import { cx } from '../ui';
import { ChromeContext, type PageMeta } from './chrome';
import { IconButton } from './controls';
import { useNavCounts } from './data';
import { Icon } from './icons';
import { DEFAULT_SEARCH_PLACEHOLDER, NAV_GROUPS, NAV_ITEMS, isNavActive } from './nav';
import { applyTheme, readStoredTheme, type Theme } from './theme';
import { initials } from './utils';

const SEARCH_DEBOUNCE_MS = 250;

const ThemeToggle = ({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) => (
  <>
    <div role="radiogroup" aria-label="Theme" className="hidden overflow-hidden rounded-card border border-white/20 text-xs font-semibold xl:flex">
      {(['light', 'dark'] as const).map(option => (
        <button key={option} type="button" role="radio" aria-checked={theme === option} onClick={() => onChange(option)} className={cx('h-8 flex-1 cursor-pointer capitalize focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white', theme === option ? 'bg-white text-primary-dark' : 'text-indigo-100 hover:bg-white/10')}>
          {option}
        </button>
      ))}
    </div>
    <button type="button" aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'} onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')} className="grid h-10 cursor-pointer place-items-center rounded-card text-indigo-100 hover:bg-white/10 xl:hidden">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  </>
);

const TopbarSearch = ({ placeholder, searchable }: { placeholder: string; searchable: boolean }) => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const urlTerm = params.get('q') ?? '';
  const [term, setTerm] = useState(urlTerm);
  const debounced = useDebounced(term, SEARCH_DEBOUNCE_MS);

  useEffect(() => setTerm(urlTerm), [pathname]);

  useEffect(() => {
    if (debounced === urlTerm) return;
    router.replace(withQuery(searchable ? pathname : '/admin/orders', { q: debounced }));
  }, [debounced]);

  return (
    <label className="flex h-10 w-[300px] items-center gap-2.5 rounded-card border border-line bg-page px-3 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-tint max-xl:w-[220px]">
      <Icon name="search" size={16} strokeWidth={1.8} className="shrink-0 text-ink-secondary" />
      <input aria-label="Search" value={term} onChange={event => setTerm(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />
    </label>
  );
};

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const counts = useNavCounts();
  const [theme, setTheme] = useState<Theme>('light');
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const stored = readStoredTheme();
    applyTheme(stored);
    setTheme(stored);
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const chooseTheme = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
  };

  const current = NAV_ITEMS.find(item => isNavActive(item, pathname));
  const title = meta?.title ?? current?.label ?? 'Admin';
  const context = useMemo(() => ({ setMeta, actionSlot }), [actionSlot]);

  return (
    <ChromeContext.Provider value={context}>
      <div className="hidden min-h-screen grid-cols-[72px_minmax(0,1fr)] bg-page text-ink md:grid xl:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto bg-sidebar px-2.5 pt-[22px] pb-[18px] text-white xl:px-3.5">
          <Link href="/admin" aria-label="WatchHub admin" className="flex items-center gap-2.5 px-2.5 pb-6 max-xl:justify-center max-xl:px-0">
            <Icon name="clock" size={22} strokeWidth={1.6} />
            <span className="font-display text-[22px] font-semibold max-xl:hidden">WatchHub</span>
            <span className="ml-auto grid h-5 place-items-center rounded-pill bg-white/12 px-[7px] text-[10px] font-semibold tracking-[0.08em] max-xl:hidden">ADMIN</span>
          </Link>
          <nav aria-label="Admin sections" className="flex flex-col gap-[18px]">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase max-xl:hidden">{group.label}</div>
                {group.items.map(item => {
                  const active = isNavActive(item, pathname);
                  const count = counts[item.key];
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      title={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={cx('relative flex h-10 items-center gap-3 rounded-card px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white max-xl:justify-center max-xl:px-0', active ? 'bg-white/12 font-semibold text-white' : 'text-indigo-100 hover:bg-white/8 hover:text-white')}
                    >
                      <Icon name={item.icon} />
                      <span className="flex-1 max-xl:sr-only">{item.label}</span>
                      {count ? (
                        <span className="grid h-5 min-w-[22px] place-items-center rounded-pill bg-white px-1.5 text-[11px] font-bold text-primary-dark max-xl:absolute max-xl:top-0.5 max-xl:right-1 max-xl:h-4 max-xl:min-w-4 max-xl:px-1 max-xl:text-[10px]">{count}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3.5 border-t border-white/12 px-2.5 pt-4 max-xl:px-0">
            <ThemeToggle theme={theme} onChange={chooseTheme} />
            <Link href="/" className="flex items-center gap-2 text-[13px] text-indigo-100 hover:text-white max-xl:justify-center" title="View storefront">
              <span className="max-xl:sr-only">View storefront</span>
              <Icon name="external" size={14} />
            </Link>
            <div className="flex items-center gap-2.5 max-xl:flex-col">
              <span className="grid size-[34px] shrink-0 place-items-center rounded-pill bg-primary-tint text-[13px] font-bold text-primary-dark">{initials(user?.name ?? 'Admin')}</span>
              <span className="flex min-w-0 flex-1 flex-col max-xl:hidden">
                <span className="truncate text-[13px] font-semibold">{user?.name}</span>
                <span className="truncate text-xs text-indigo-100">{user?.email}</span>
              </span>
              <IconButton icon="logout" label="Log out" size={32} className="text-indigo-100 hover:text-white" onClick={() => logout().then(() => router.push('/login'))} />
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-6 border-b border-line bg-surface px-8 max-xl:px-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-xs text-ink-secondary">Admin / {meta?.crumb ?? title}</div>
              <h1 className="truncate font-display text-[26px] leading-[1.15] font-medium">{title}</h1>
            </div>
            <div className="flex flex-none items-center gap-2.5">
              <TopbarSearch placeholder={current?.searchPlaceholder ?? DEFAULT_SEARCH_PLACEHOLDER} searchable={Boolean(current?.searchPlaceholder)} />
              <div ref={setActionSlot} className="flex items-center gap-2.5" />
            </div>
          </header>
          <div className="flex flex-col gap-6 px-8 pt-7 pb-16 max-xl:px-6">{children}</div>
        </main>
      </div>

      <div className="grid min-h-screen place-items-center bg-page px-8 text-center md:hidden">
        <div className="flex max-w-xs flex-col items-center gap-3">
          <Icon name="monitor" size={40} strokeWidth={1.3} className="text-ink-muted" />
          <h1 className="font-display text-2xl">Open on a larger screen</h1>
          <p className="text-sm leading-normal text-ink-secondary">The admin console needs a tablet or desktop. Open it on a wider screen to manage orders, products and customers.</p>
          <Link href="/" className="text-sm font-semibold text-link hover:underline">
            Back to the storefront
          </Link>
        </div>
      </div>
    </ChromeContext.Provider>
  );
};
