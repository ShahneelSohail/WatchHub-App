import Link from 'next/link';

const columns = [
  {
    title: 'Shop',
    links: [
      { href: '/watches', label: 'All watches' },
      { href: '/watches?featured=true', label: 'Featured' },
      { href: '/wishlist', label: 'Wishlist' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/support', label: 'Contact support' },
      { href: '/orders', label: 'Track an order' },
    ],
  },
];

export const Footer = () => (
  <footer className="mt-20 border-t border-line bg-navy-dark text-white/80">
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 md:grid-cols-[2fr_1fr_1fr] md:px-8">
      <div>
        <p className="font-serif text-2xl font-semibold text-white">
          Watch<span className="text-gold-soft">Hub</span>
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed">Considered watches, honest prices and a two-year warranty on every piece.</p>
      </div>
      {columns.map(column => (
        <div key={column.title}>
          <p className="mb-3 text-sm font-medium text-white">{column.title}</p>
          <ul className="space-y-2 text-sm">
            {column.links.map(link => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <p className="border-t border-white/10 py-5 text-center text-xs text-white/50">
      A portfolio rebuild of the WatchHub team project. Payments run in Stripe test mode.
    </p>
  </footer>
);
