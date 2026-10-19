'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../Providers';
import { cx } from '../ui';

const sections = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/catalog', label: 'Brands & categories' },
  { href: '/admin/content', label: 'Banners & FAQs' },
  { href: '/admin/tickets', label: 'Support tickets' },
];

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 bg-navy-dark text-white/80 md:sticky md:top-0 md:h-screen md:w-64">
        <div className="flex items-center justify-between px-6 py-5 md:block">
          <Link href="/admin" className="font-serif text-2xl font-semibold text-white">
            Watch<span className="text-gold-soft">Hub</span>
            <span className="ml-2 text-xs font-sans font-normal tracking-widest text-white/50 uppercase">Admin</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible" aria-label="Admin sections">
          {sections.map(section => (
            <Link key={section.href} href={section.href} className={cx('rounded-xl px-4 py-2.5 text-sm whitespace-nowrap transition', isActive(section.href) ? 'bg-white/10 font-medium text-white' : 'hover:bg-white/5 hover:text-white')}>
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-6 py-5 text-sm md:absolute md:bottom-0 md:block md:w-full">
          <p className="truncate text-white/60">{user?.email}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="hover:text-white">
              View store
            </Link>
            <button onClick={() => logout().then(() => router.push('/login'))} className="hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
};
