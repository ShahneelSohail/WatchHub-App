'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { cartCount, useCart } from '@/lib/shop';
import type { Category } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { useAuth } from './Providers';
import { useStoreUi } from './StoreUi';
import { cx, IconButton } from './ui';

const PRODUCT_PATH = /^\/watches\/[^/]+$/;

const Logo = ({ className }: { className?: string }) => (
  <Link href="/" className={cx('flex items-center gap-2 text-ink md:gap-2.5', className)} aria-label="WatchHub home">
    <Icon name="clock" size={22} strokeWidth={1.6} className="text-primary" />
    <span className="font-display text-[21px] font-semibold md:text-2xl xl:text-[26px]">WatchHub</span>
  </Link>
);

const PromoBar = () => (
  <div className="hidden bg-primary-dark text-xs tracking-[0.02em] text-on-primary xl:block">
    <div className="wrap flex h-9 items-center justify-between gap-6">
      <span>Free shipping on every order · Two-year international warranty</span>
      <span className="flex gap-5 text-primary-tint">
        <Link href="/faq" className="hover:text-on-primary">
          Help
        </Link>
        <Link href="/orders" className="hover:text-on-primary">
          Track order
        </Link>
        <span>USD · English</span>
      </span>
    </div>
  </div>
);

const CategoryNav = () => {
  const pathname = usePathname();
  const categoryId = useSearchParams().get('categoryId');
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const onShop = pathname === '/watches';
  const items = [{ href: '/watches', label: 'All watches', active: onShop && !categoryId }, ...(categories.data ?? []).map(category => ({ href: `/watches?categoryId=${category.id}`, label: category.name, active: onShop && categoryId === String(category.id) }))];

  return (
    <nav aria-label="Categories" className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex">
      {items.map(item => (
        <Link key={item.href} href={item.href} className={cx('flex h-11 shrink-0 items-center px-3.5 text-sm whitespace-nowrap transition-colors hover:text-primary', item.active ? 'font-medium text-ink' : 'text-ink-secondary')}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

const SearchTrigger = () => {
  const { openSearch } = useStoreUi();
  return (
    <button onClick={openSearch} className="hidden h-11 w-[260px] items-center gap-2.5 rounded-card border border-line bg-page pr-3 pl-3.5 text-sm text-ink-secondary transition-colors hover:border-primary md:flex xl:w-[clamp(44px,20vw,260px)]">
      <Icon name="search" size={16} strokeWidth={1.8} />
      <span className="flex-1 truncate text-left">Search watches</span>
      <kbd className="hidden h-[22px] place-items-center rounded-card border border-line bg-surface px-1.5 font-sans text-[11px] font-semibold xl:grid">⌘K</kbd>
    </button>
  );
};

const menuLink = 'block rounded-card px-3 py-2.5 text-sm hover:bg-primary-tint hover:text-primary';

const AccountMenu = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.type === 'keydown' ? (event as KeyboardEvent).key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return <IconLink href="/login" icon="user" label="Log in" />;

  const links = [
    ...(user.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin console' }] : []),
    { href: '/orders', label: 'My orders' },
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/account', label: 'Account' },
    { href: '/support', label: 'Support' },
  ];

  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen(current => !current)} aria-label="Account menu" aria-expanded={open} className="grid h-11 w-11 place-items-center">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[13px] font-semibold text-on-primary">{user.name.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-card border border-line bg-surface p-1.5 shadow-menu animate-rise">
          <p className="truncate px-3 py-2 text-xs text-ink-secondary">{user.email}</p>
          {links.map(link => (
            <Link key={link.href} href={link.href} className={menuLink}>
              {link.label}
            </Link>
          ))}
          <button onClick={() => logout().then(() => router.push('/'))} className={cx(menuLink, 'w-full text-left')}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

const IconLink = ({ href, icon, label, count, className }: { href: string; icon: IconName; label: string; count?: number; className?: string }) => (
  <Link href={href} aria-label={label} className={cx('relative grid h-11 w-11 place-items-center text-ink transition-colors hover:text-primary', className)}>
    <Icon name={icon} size={20} />
    {count ? <span className="absolute top-1.5 right-1 grid h-[17px] min-w-[17px] place-items-center rounded-pill bg-danger px-1 text-[10px] font-bold text-on-primary">{count}</span> : null}
  </Link>
);

const BagButtons = ({ count }: { count: number }) => {
  const { openBag } = useStoreUi();
  return (
    <>
      <IconButton icon="bag" label="Bag" count={count} onClick={openBag} className="xl:hidden" />
      <button onClick={openBag} aria-label="Bag" className="hidden h-11 items-center gap-2 rounded-card bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover xl:flex">
        <Icon name="bag" size={18} strokeWidth={1.8} />
        Bag
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-surface px-1.5 text-[11px] text-primary">{count}</span>
      </button>
    </>
  );
};

const TABS: { key: string; label: string; icon: IconName; href?: string; match: (pathname: string) => boolean }[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/', match: pathname => pathname === '/' },
  { key: 'shop', label: 'Watches', icon: 'watch', href: '/watches', match: pathname => pathname.startsWith('/watches') },
  { key: 'search', label: 'Search', icon: 'search', match: () => false },
  { key: 'saved', label: 'Saved', icon: 'heart', href: '/wishlist', match: pathname => pathname === '/wishlist' },
  { key: 'bag', label: 'Bag', icon: 'bag', match: pathname => pathname === '/cart' },
];

const TabBar = ({ count }: { count: number }) => {
  const pathname = usePathname();
  const { openSearch, openBag, bagOpen, searchOpen } = useStoreUi();
  const actions: Record<string, () => void> = { search: openSearch, bag: openBag };

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 border-t border-line bg-surface/95 px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {TABS.map(tab => {
        const active = tab.key === 'search' ? searchOpen : tab.key === 'bag' ? bagOpen || tab.match(pathname) : tab.match(pathname) && !searchOpen && !bagOpen;
        const content: ReactNode = (
          <>
            <span className="relative">
              <Icon name={tab.icon} size={22} strokeWidth={1.6} />
              {tab.key === 'bag' && count > 0 && <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-on-primary">{count}</span>}
            </span>
            <span>{tab.label}</span>
          </>
        );
        const className = cx('flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] tracking-[0.04em]', active ? 'text-primary' : 'text-ink-secondary');
        return tab.href ? (
          <Link key={tab.key} href={tab.href} className={className} aria-current={active ? 'page' : undefined}>
            {content}
          </Link>
        ) : (
          <button key={tab.key} onClick={actions[tab.key]} className={className}>
            {content}
          </button>
        );
      })}
    </nav>
  );
};

export const Navbar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data: cart } = useCart();
  const count = cartCount(cart);
  const onProduct = PRODUCT_PATH.test(pathname);
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.page('/notifications?pageSize=1')).meta.unread ?? 0,
    enabled: Boolean(user),
  });
  const { openSearch } = useStoreUi();

  return (
    <>
      <PromoBar />
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap grid h-16 grid-cols-[1fr_auto_1fr] items-center md:flex md:gap-2 xl:h-[76px] xl:gap-10">
          <div className="flex md:hidden">{onProduct ? <IconButton icon="chevronLeft" label="Back to all watches" onClick={() => router.push('/watches')} /> : <IconButton icon="search" label="Search" onClick={openSearch} />}</div>
          <Logo className="justify-self-center md:mr-auto md:justify-self-auto xl:mr-0" />
          <Suspense>
            <CategoryNav />
          </Suspense>
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <SearchTrigger />
            <IconLink href="/wishlist" icon="heart" label="Wishlist" className="hidden md:grid" />
            {user && <IconLink href="/notifications" icon="bell" label="Notifications" count={unread} className="hidden md:grid" />}
            {user ? <AccountMenu /> : <IconLink href="/login" icon="user" label="Log in" />}
            <BagButtons count={count} />
          </div>
        </div>
      </header>
      {!onProduct && <TabBar count={count} />}
    </>
  );
};
