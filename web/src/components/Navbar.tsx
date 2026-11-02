'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useCart } from '@/lib/shop';
import { useAuth } from './Providers';
import { LinkButton } from './ui';

const links = [
  { href: '/watches', label: 'Watches' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
];

const CountBadge = ({ count }: { count: number }) =>
  count > 0 ? <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-semibold text-white">{count}</span> : null;

const IconLink = ({ href, label, count, children }: { href: string; label: string; count?: number; children: React.ReactNode }) => (
  <Link href={href} aria-label={label} className="relative text-muted transition hover:text-navy">
    {children}
    <CountBadge count={count ?? 0} />
  </Link>
);

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Navbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: cart } = useCart();
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.page('/notifications?pageSize=1')).meta.unread ?? 0,
    enabled: Boolean(user),
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(search.trim() ? `/watches?q=${encodeURIComponent(search.trim())}` : '/watches');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-5 sm:gap-6 md:px-8">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight text-navy">
          Watch<span className="text-gold">Hub</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="transition hover:text-navy">
              {link.label}
            </Link>
          ))}
        </nav>
        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 lg:block" role="search">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search watches"
            aria-label="Search watches"
            className="w-full rounded-full border border-line bg-ivory px-4 py-2 text-sm placeholder:text-faint focus:border-navy focus:outline-none"
          />
        </form>
        <div className="ml-auto flex items-center gap-3 sm:gap-5 lg:ml-0">
          <IconLink href="/wishlist" label="Wishlist">
            <svg {...iconProps}>
              <path d="M12 20s-7-4.4-9-9a4.900 4.900 0 019-2.700A4.900 4.900 0 0121 11c-2 4.600-9 9-9 9z" />
            </svg>
          </IconLink>
          <IconLink href="/cart" label="Cart" count={cart?.reduce((sum, line) => sum + line.quantity, 0)}>
            <svg {...iconProps}>
              <path d="M6 7h12l-1 13H7L6 7z" />
              <path d="M9 7a3 3 0 016 0" />
            </svg>
          </IconLink>
          {user && (
            <IconLink href="/notifications" label="Notifications" count={unread}>
              <svg {...iconProps}>
                <path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z" />
                <path d="M10 21a2 2 0 004 0" />
              </svg>
            </IconLink>
          )}
          {user ? (
            <details className="group relative">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-navy text-sm font-semibold text-white" aria-label="Account menu">
                {user.name.charAt(0).toUpperCase()}
              </summary>
              <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-line bg-ivory p-2 text-sm shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-faint">{user.email}</p>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="block rounded-lg px-3 py-2 font-medium text-navy hover:bg-sand">
                    Admin console
                  </Link>
                )}
                <Link href="/orders" className="block rounded-lg px-3 py-2 hover:bg-sand">
                  My orders
                </Link>
                <Link href="/account" className="block rounded-lg px-3 py-2 hover:bg-sand">
                  Account
                </Link>
                <button onClick={() => logout().then(() => router.push('/'))} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-sand">
                  Log out
                </button>
              </div>
            </details>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <LinkButton href="/login" variant="ghost">
                Log in
              </LinkButton>
              <LinkButton href="/register">Sign up</LinkButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
