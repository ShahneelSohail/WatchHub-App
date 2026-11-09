import Link from 'next/link';

const columns = [
  {
    title: 'Shop',
    links: [
      { href: '/watches', label: 'All watches' },
      { href: '/watches?featured=true', label: 'Featured watches' },
      { href: '/wishlist', label: 'Wishlist' },
    ],
  },
  {
    title: 'Service',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/support', label: 'Contact support' },
      { href: '/orders', label: 'Track an order' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/orders', label: 'My orders' },
      { href: '/account', label: 'Account settings' },
      { href: '/notifications', label: 'Notifications' },
    ],
  },
];

export const Footer = () => (
  <footer className="mt-auto bg-primary-dark text-on-primary">
    <div className="wrap grid gap-8 pt-12 pb-10 md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(3,1fr)] xl:gap-10 xl:pt-16 xl:pb-10">
      <div className="flex flex-col gap-3.5 md:col-span-3 xl:col-span-1">
        <span className="font-display text-[28px] font-semibold xl:text-3xl">WatchHub</span>
        <p className="max-w-[300px] text-sm leading-relaxed text-primary-tint">Watches from four houses, inspected by hand and shipped free worldwide.</p>
      </div>
      {columns.map(column => (
        <div key={column.title} className="flex flex-col gap-1 text-sm md:gap-3">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-primary-tint uppercase">{column.title}</p>
          {column.links.map(link => (
            <Link key={link.label} href={link.href} className="flex min-h-8 items-center hover:text-primary-tint">
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </div>
    <div className="border-t border-white/15">
      <p className="wrap pt-5 pb-28 text-xs text-primary-tint md:pb-7">© 2026 WatchHub · USD · English · Payments run in Stripe test mode</p>
    </div>
  </footer>
);
