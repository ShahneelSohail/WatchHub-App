import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type OrderStatus, type PaymentMethod, type StrapType } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD ?? 'WatchHub123!';
const DAY = 24 * 60 * 60 * 1000;

interface SeedColor {
  name: string;
  hex: string;
}

interface SeedWatch {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice?: number;
  stock: number;
  description: string;
  specifications: Record<string, string>;
  colors: SeedColor[];
  hasBeltOption?: boolean;
  hasChainOption?: boolean;
  isFeatured?: boolean;
  isLimitedEdition?: boolean;
  isNew?: boolean;
  draft?: boolean;
  imageSlug?: string;
}

const BRANDS = [
  { name: 'Aurelle', description: 'Swiss-inspired dress watches with a quiet, formal elegance.' },
  { name: 'Kairos', description: 'Bold sport luxury for people who never stand still.' },
  { name: 'Meridian', description: 'Classic automatic movements built to be handed down.' },
  { name: 'Pulse', description: 'Connected watches that track health, sleep and every workout.' },
];

const CATEGORIES = [
  { name: 'Luxury', description: 'Statement pieces in precious finishes.' },
  { name: 'Classic', description: 'Timeless dress and day-to-day watches.' },
  { name: 'Sports', description: 'Rugged, water resistant and shock proof.' },
  { name: 'Smartwatch', description: 'Fitness tracking and notifications on your wrist.' },
  { name: 'Women', description: 'Slim, jewellery-grade watches.' },
];

const WATCHES: SeedWatch[] = [
  {
    slug: 'orbis-celeste', name: 'Orbis Celeste', brand: 'Aurelle', category: 'Luxury', price: 3450, salePrice: 2990, stock: 5, isFeatured: true, isLimitedEdition: true, hasBeltOption: true,
    description: 'A moonphase-inspired dress watch with a domed sapphire crystal and a hand-stitched alligator strap. Limited to 500 pieces per colour.',
    specifications: { Movement: 'Automatic', Case: '40 mm stainless steel', Crystal: 'Sapphire', 'Water resistance': '50 m', 'Power reserve': '42 hours' },
    colors: [{ name: 'Chocolate Brown', hex: '#4a2f22' }, { name: 'Forest Green', hex: '#1f4d3a' }, { name: 'Pearl White', hex: '#f1ede4' }],
  },
  {
    slug: 'kairos-chronos', name: 'Kairos Chronos', brand: 'Kairos', category: 'Luxury', price: 5200, stock: 4, isFeatured: true, hasBeltOption: true,
    description: 'Rose-gold bezel, vulcanised rubber strap and an integrated case that wears like a second skin.',
    specifications: { Movement: 'Automatic chronograph', Case: '42 mm rose gold PVD steel', Crystal: 'Sapphire', 'Water resistance': '100 m', 'Power reserve': '50 hours' },
    colors: [{ name: 'Navy', hex: '#1b2a4a' }, { name: 'Burgundy', hex: '#6d1f2f' }, { name: 'Onyx', hex: '#16161a' }],
  },
  {
    slug: 'regalia-day-date', name: 'Regalia Day-Date', brand: 'Meridian', category: 'Classic', price: 2480, salePrice: 2190, stock: 9, isFeatured: true, hasChainOption: true,
    description: 'A fluted bezel and a fully bracelet-fitted case. The day and date flip at midnight on the dot.',
    specifications: { Movement: 'Automatic 28,800 vph', Case: '36 mm 316L steel', Crystal: 'Sapphire', 'Water resistance': '100 m', Bracelet: 'Oyster-style' },
    colors: [{ name: 'Sapphire Blue', hex: '#1d4ed8' }, { name: 'Silver', hex: '#c0c4cc' }, { name: 'Champagne Gold', hex: '#d4af37' }],
  },
  {
    slug: 'pulse-square', name: 'Pulse Square', brand: 'Pulse', category: 'Smartwatch', price: 129, stock: 40, hasBeltOption: true, isNew: true,
    description: 'A bright square display with heart rate, SpO2, sleep tracking and 100 sport modes. Up to 7 days of battery.',
    specifications: { Display: '1.69" AMOLED', Battery: '7 days', Sensors: 'Heart rate, SpO2', 'Water resistance': '5 ATM', Connectivity: 'Bluetooth 5.3' },
    colors: [{ name: 'Lime', hex: '#a3e635' }, { name: 'White', hex: '#f5f5f5' }, { name: 'Navy', hex: '#1e3a8a' }],
  },
  {
    slug: 'pulse-noir', name: 'Pulse Noir', brand: 'Pulse', category: 'Smartwatch', price: 149, salePrice: 119, stock: 25,
    description: 'A minimalist black-glass smartwatch with a silicone strap, built for people who want the data without the noise.',
    specifications: { Display: '1.57" LCD', Battery: '10 days', Sensors: 'Heart rate, sleep', 'Water resistance': '5 ATM', Connectivity: 'Bluetooth 5.2' },
    colors: [{ name: 'Moss Green', hex: '#2f5d3a' }, { name: 'Midnight Navy', hex: '#1b2a4a' }, { name: 'Sunflower', hex: '#facc15' }],
  },
  {
    slug: 'pulse-orbit', name: 'Pulse Orbit', brand: 'Pulse', category: 'Smartwatch', price: 189, stock: 18, isFeatured: true,
    description: 'A round AMOLED smartwatch with GPS, rotating crown and a metal case. Calls and replies from your wrist.',
    specifications: { Display: '1.43" AMOLED', Battery: '5 days', GPS: 'Built-in', 'Water resistance': '5 ATM', Connectivity: 'Bluetooth calling' },
    colors: [{ name: 'Sky Blue', hex: '#7dd3fc' }, { name: 'Sunset Orange', hex: '#fb923c' }, { name: 'Carbon Black', hex: '#1f1f23' }],
  },
  {
    slug: 'meridian-jubilee', name: 'Meridian Jubilee', brand: 'Meridian', category: 'Classic', price: 890, stock: 12, hasChainOption: true,
    description: 'A jubilee-bracelet automatic with a bilingual day-date window and an ice-blue dial.',
    specifications: { Movement: 'Automatic', Case: '39 mm steel', Crystal: 'Sapphire', 'Water resistance': '50 m', Bracelet: 'Five-link jubilee' },
    colors: [{ name: 'Onyx & Gold', hex: '#2a2a2a' }, { name: 'Ice Silver', hex: '#d0d7de' }, { name: 'Full Gold', hex: '#d4af37' }],
  },
  {
    slug: 'tidal-force', name: 'Tidal Force', brand: 'Kairos', category: 'Sports', price: 249, stock: 30, hasBeltOption: true,
    description: 'Shock-resistant analogue-digital diver with a 200 m rating, world time and a luminous dial.',
    specifications: { Movement: 'Quartz analogue-digital', Case: '51 mm resin', 'Shock resistance': 'Yes', 'Water resistance': '200 m', Features: 'Stopwatch, alarm, world time' },
    colors: [{ name: 'Glacier White', hex: '#f4f4f5' }, { name: 'Blaze Orange', hex: '#f97316' }, { name: 'Cobalt', hex: '#1d4ed8' }],
  },
  {
    slug: 'lunar-chrono', name: 'Lunar Chrono', brand: 'Aurelle', category: 'Classic', price: 1320, salePrice: 1150, stock: 7, isFeatured: true, hasBeltOption: true,
    description: 'A triple-register moonphase chronograph on a leather strap, with gilt hands and a day-date window.',
    specifications: { Movement: 'Quartz multifunction', Case: '41 mm steel', Crystal: 'Sapphire', 'Water resistance': '30 m', Strap: 'Calfskin leather' },
    colors: [{ name: 'Midnight Navy', hex: '#1b2a4a' }, { name: 'Racing Green', hex: '#14532d' }, { name: 'Oxblood', hex: '#7f1d1d' }],
  },
  {
    slug: 'solitaire', name: 'Solitaire', brand: 'Aurelle', category: 'Women', price: 620, stock: 14, isFeatured: true, hasChainOption: true,
    description: 'A slim bracelet watch with a sunray dial and a hidden clasp. Dresses up or down.',
    specifications: { Movement: 'Swiss quartz', Case: '28 mm steel', Crystal: 'Sapphire', 'Water resistance': '30 m', Bracelet: 'Pyramid link' },
    colors: [{ name: 'Yellow Gold', hex: '#d4af37' }, { name: 'Rose Gold', hex: '#d99a85' }, { name: 'Silver', hex: '#c0c4cc' }],
  },
  {
    slug: 'petite-mesh', name: 'Petite Mesh', brand: 'Meridian', category: 'Women', price: 340, stock: 0, hasChainOption: true,
    description: 'A 22 mm case on a milanese mesh strap that adjusts to any wrist without tools.',
    specifications: { Movement: 'Japanese quartz', Case: '22 mm steel', Crystal: 'Mineral', 'Water resistance': '30 m', Strap: 'Milanese mesh' },
    colors: [{ name: 'Rose Gold', hex: '#d99a85' }, { name: 'Emerald Gold', hex: '#b7a24a' }, { name: 'Midnight Silver', hex: '#c0c4cc' }],
  },
  {
    slug: 'cascade-bangle', name: 'Cascade Bangle', brand: 'Aurelle', category: 'Women', price: 780, stock: 3, isLimitedEdition: true, hasChainOption: true,
    description: 'A cut-crystal link bracelet with a round pearl dial. Limited to 300 pieces.',
    specifications: { Movement: 'Swiss quartz', Case: '26 mm steel', Crystal: 'Sapphire', 'Water resistance': '30 m', Setting: 'Cut crystal links' },
    colors: [{ name: 'Silver', hex: '#c0c4cc' }, { name: 'Rose', hex: '#d99a85' }, { name: 'Gold', hex: '#d4af37' }],
  },
  {
    slug: 'aurora-pave', name: 'Aurora Pavé', brand: 'Kairos', category: 'Women', price: 910, salePrice: 810, stock: 8, isNew: true,
    description: 'A pavé crystal bezel and a glacier-blue dial on a slim steel bracelet.',
    specifications: { Movement: 'Swiss quartz', Case: '30 mm steel', Crystal: 'Sapphire', 'Water resistance': '50 m', Bezel: 'Pavé crystal' },
    colors: [{ name: 'Rose Gold', hex: '#d99a85' }, { name: 'Champagne', hex: '#e8d5b5' }, { name: 'Silver', hex: '#c0c4cc' }],
  },
];

const DRAFT_WATCH: SeedWatch = {
  slug: 'aurora-nuit', name: 'Aurora Nuit', brand: 'Kairos', category: 'Women', price: 960, stock: 6, draft: true, imageSlug: 'aurora-pave',
  description: 'A midnight-blue pave edition of the Aurora, being prepared for launch.',
  specifications: { Movement: 'Swiss quartz', Case: '30 mm steel', Crystal: 'Sapphire', 'Water resistance': '50 m', Bezel: 'Pave crystal' },
  colors: [{ name: 'Midnight', hex: '#1b2a4a' }, { name: 'Silver', hex: '#c0c4cc' }, { name: 'Rose Gold', hex: '#d99a85' }],
};

const ALL_WATCHES = [...WATCHES, DRAFT_WATCH];

const USERS = [
  { email: 'admin@watchhub.test', name: 'WatchHub Admin', role: 'ADMIN' as const },
  { email: 'maya@watchhub.test', name: 'Maya Fernandez', role: 'CUSTOMER' as const },
  { email: 'omar@watchhub.test', name: 'Omar Haddad', role: 'CUSTOMER' as const },
  { email: 'lena@watchhub.test', name: 'Lena Berg', role: 'CUSTOMER' as const },
];

const ADDRESSES = [
  { recipient: 'Maya Fernandez', addressLine: '221 Harbor View Drive', city: 'San Diego', state: 'CA', zip: '92101', country: 'United States', phone: '+1 619 555 0142' },
  { recipient: 'Omar Haddad', addressLine: '48 Granville Street', city: 'Vancouver', state: 'BC', zip: 'V6C 1T2', country: 'Canada', phone: '+1 604 555 0188' },
  { recipient: 'Lena Berg', addressLine: '17 Kungsgatan', city: 'Stockholm', state: 'AB', zip: '111 43', country: 'Sweden', phone: '+46 8 555 0123' },
];

const COUPONS = [
  { code: 'WELCOME10', type: 'PERCENTAGE' as const, value: 10, minAmount: 100, usageLimit: 500, usageCount: 128, limitPerUser: 1, expiresAt: new Date(Date.now() + 120 * DAY) },
  { code: 'SAVE50', type: 'FIXED' as const, value: 50, minAmount: 500, usageLimit: 200, usageCount: 37, startsAt: new Date(Date.now() - 30 * DAY), expiresAt: new Date(Date.now() + 90 * DAY) },
  { code: 'AUTUMN15', type: 'PERCENTAGE' as const, value: 15, minAmount: 300, usageLimit: 300, usageCount: 41, expiresAt: new Date(Date.now() + 40 * DAY) },
  { code: 'VIP100', type: 'FIXED' as const, value: 100, minAmount: 1000, usageLimit: 50, usageCount: 6, isActive: false },
  { code: 'SUMMER20', type: 'PERCENTAGE' as const, value: 20, usageLimit: 400, usageCount: 400, expiresAt: new Date(Date.now() - 10 * DAY) },
];

const BANNERS = [
  { imageUrl: '/watches/kairos-chronos-1.webp', eyebrow: 'No 01 · Signature', title: 'Precision, perfected', subtitle: 'The Kairos Chronos: rose gold, integrated, unmistakable.', link: '/watches/kairos-chronos', slug: 'kairos-chronos', isActive: true },
  { imageUrl: '/watches/regalia-day-date-1.webp', eyebrow: 'No 02 · Offer', title: 'Timeless, on sale', subtitle: 'The Regalia Day-Date, now $290 below its list price.', link: '/watches/regalia-day-date', slug: 'regalia-day-date', isActive: true },
  { imageUrl: '/watches/pulse-orbit-2.webp', eyebrow: 'No 03 · Smart', title: 'Smarter every day', subtitle: 'GPS, calls and five days of battery with the Pulse Orbit.', link: '/watches/pulse-orbit', slug: 'pulse-orbit', isActive: true },
  { imageUrl: '/watches/aurora-pave-1.webp', eyebrow: 'No 04 · Coming soon', title: 'Aurora after dark', subtitle: 'A midnight pave edition, arriving soon.', link: '/watches/aurora-pave', slug: 'aurora-pave', isActive: false },
];

const FAQS = [
  { category: 'Orders', question: 'How long does delivery take?', answer: 'Standard shipping is free and arrives in 4 to 6 business days. Express arrives in 1 to 2 business days for a flat $25.' },
  { category: 'Orders', question: 'Can I cancel my order?', answer: 'You can cancel from your orders page until it ships, as long as it has not been paid by card. Paid orders can be cancelled by contacting support.' },
  { category: 'Payments', question: 'Which payment methods do you accept?', answer: 'Credit and debit cards through Stripe, and Cash on Delivery in selected regions.' },
  { category: 'Payments', question: 'Is my card information safe?', answer: 'Card details are entered on Stripe-hosted checkout and never touch our servers.' },
  { category: 'Products', question: 'Are the watches covered by a warranty?', answer: 'Every watch includes a two-year international warranty against manufacturing defects.' },
  { category: 'Products', question: 'Can I change the strap?', answer: 'Watches marked with a belt or chain option let you choose the strap at checkout. Extra straps are available from support.' },
  { category: 'Returns', question: 'What is your returns policy?', answer: 'Return any unworn watch within 30 days. We collect it for free and refund the original payment method.' },
  { category: 'Returns', question: 'How long do refunds take?', answer: 'Card refunds reach your bank in 5 to 10 working days. Cash-on-delivery refunds are paid by bank transfer.' },
];

const ADMIN_NAME = 'WatchHub Admin';

const HOURS_AGO = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

interface SeedOrder {
  user: string;
  watches: { slug: string; quantity: number; color?: number; strap?: StrapType }[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  daysAgo: number;
  tracking?: string;
  paid?: boolean;
  refunds?: { amount: number; reason: string }[];
  notes?: string[];
}

const ORDERS: SeedOrder[] = [
  { user: 'maya@watchhub.test', watches: [{ slug: 'regalia-day-date', quantity: 1, color: 0 }], status: 'DELIVERED', paymentMethod: 'STRIPE', daysAgo: 21, tracking: 'WH-100231', refunds: [{ amount: 300, reason: 'Strap exchange' }], notes: ['Customer asked for a longer strap, partial refund agreed.'] },
  { user: 'maya@watchhub.test', watches: [{ slug: 'pulse-orbit', quantity: 2, color: 1 }], status: 'SHIPPED', paymentMethod: 'STRIPE', daysAgo: 3, tracking: 'WH-100302' },
  { user: 'omar@watchhub.test', watches: [{ slug: 'lunar-chrono', quantity: 1, color: 0, strap: 'BELT' }], status: 'DELIVERED', paymentMethod: 'COD', daysAgo: 14, tracking: 'WH-100244' },
  { user: 'omar@watchhub.test', watches: [{ slug: 'tidal-force', quantity: 1, color: 1 }, { slug: 'pulse-square', quantity: 1, color: 0 }], status: 'CONFIRMED', paymentMethod: 'STRIPE', daysAgo: 1 },
  { user: 'lena@watchhub.test', watches: [{ slug: 'solitaire', quantity: 1, color: 1, strap: 'CHAIN' }], status: 'DELIVERED', paymentMethod: 'STRIPE', daysAgo: 30, tracking: 'WH-100188' },
  { user: 'lena@watchhub.test', watches: [{ slug: 'orbis-celeste', quantity: 1, color: 2, strap: 'BELT' }], status: 'PENDING', paymentMethod: 'COD', daysAgo: 0 },
  { user: 'maya@watchhub.test', watches: [{ slug: 'pulse-noir', quantity: 1, color: 2 }], status: 'CANCELLED', paymentMethod: 'COD', daysAgo: 8 },
  { user: 'omar@watchhub.test', watches: [{ slug: 'meridian-jubilee', quantity: 1, color: 1 }], status: 'PENDING_PAYMENT', paymentMethod: 'STRIPE', daysAgo: 1 },
  { user: 'lena@watchhub.test', watches: [{ slug: 'pulse-square', quantity: 1, color: 2 }], status: 'CANCELLED', paymentMethod: 'STRIPE', daysAgo: 12, paid: true, refunds: [{ amount: 129, reason: 'Order cancelled' }] },
  { user: 'maya@watchhub.test', watches: [{ slug: 'kairos-chronos', quantity: 1, color: 0 }], status: 'CONFIRMED', paymentMethod: 'STRIPE', daysAgo: 2, notes: ['Gift order, include the presentation box.'] },
];

const REVIEWS = [
  { user: 'maya@watchhub.test', slug: 'regalia-day-date', rating: 5, comment: 'The bracelet is flawless and the date flips right at midnight. Looks far more expensive than it is.' },
  { user: 'omar@watchhub.test', slug: 'lunar-chrono', rating: 4, comment: 'Beautiful dial and the leather is soft from day one. The moonphase is smaller in person than in photos.' },
  { user: 'lena@watchhub.test', slug: 'solitaire', rating: 5, comment: 'Slim, light and the rose gold is subtle. I wear it every day.' },
];

const main = async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%'`;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map(({ tablename }) => `"${tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = new Map(
    await Promise.all(USERS.map(async user => [user.email, await prisma.user.create({ data: { ...user, passwordHash } })] as const))
  );
  const customers = USERS.filter(user => user.role === 'CUSTOMER');
  const addresses = new Map(
    await Promise.all(
      customers.map(async (customer, index) => [customer.email, await prisma.address.create({ data: { ...ADDRESSES[index]!, userId: users.get(customer.email)!.id, isDefault: true } })] as const)
    )
  );

  const brands = new Map(await Promise.all(BRANDS.map(async brand => [brand.name, await prisma.brand.create({ data: brand })] as const)));
  const categories = new Map(await Promise.all(CATEGORIES.map(async category => [category.name, await prisma.category.create({ data: category })] as const)));

  const watches = new Map(
    await Promise.all(
      ALL_WATCHES.map(async ({ brand, category, colors, slug, draft, imageSlug, stock, ...watch }, index) => {
        const images = colors.map((_, colorIndex) => `/watches/${imageSlug ?? slug}-${colorIndex + 1}.webp`);
        const colorStocks = colors.map((_, colorIndex) => Math.floor(stock / colors.length) + (colorIndex === 0 ? stock % colors.length : 0));
        const created = await prisma.watch.create({
          data: {
            ...watch,
            slug,
            stock,
            trackColorStock: true,
            status: draft ? 'DRAFT' : 'PUBLISHED',
            sku: `WH-${String(index + 1).padStart(3, '0')}`,
            brandId: brands.get(brand)!.id,
            categoryId: categories.get(category)!.id,
            images,
            colors: { create: colors.map((color, colorIndex) => ({ ...color, image: images[colorIndex], stock: colorStocks[colorIndex]! })) },
          },
          include: { colors: { orderBy: { id: 'asc' } } },
        });
        return [slug, created] as const;
      })
    )
  );

  await prisma.coupon.createMany({ data: COUPONS });
  await prisma.banner.createMany({ data: BANNERS.map(({ slug, ...banner }, index) => ({ ...banner, watchId: watches.get(slug)!.id, sortOrder: index })) });
  await prisma.faq.createMany({ data: FAQS.map((faq, index) => ({ ...faq, sortOrder: index })) });

  const orderIds: number[] = [];
  for (const seed of ORDERS) {
    const user = users.get(seed.user)!;
    const { recipient, addressLine, city, state, zip, country, phone } = addresses.get(seed.user)!;
    const lines = seed.watches.map(line => {
      const watch = watches.get(line.slug)!;
      const color = line.color === undefined ? undefined : watch.colors[line.color];
      return { watch, quantity: line.quantity, strapType: line.strap ?? null, productColor: color?.name ?? null, image: color?.image ?? watch.images[0] ?? null, unitPrice: Number(watch.salePrice ?? watch.price) };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const createdAt = HOURS_AGO(seed.daysAgo * 24 + 2);
    const paid = seed.paid ?? (seed.status !== 'CANCELLED' && seed.status !== 'PENDING' && seed.status !== 'PENDING_PAYMENT' && (seed.paymentMethod === 'STRIPE' || seed.status === 'DELIVERED'));
    const refunds = seed.refunds ?? [];
    const refundedAmount = refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const initialStatus: OrderStatus = seed.paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'PENDING';
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: seed.status,
        paymentMethod: seed.paymentMethod,
        paymentStatus: refundedAmount === 0 ? (paid ? 'PAID' : 'UNPAID') : refundedAmount >= subtotal ? 'REFUNDED' : 'PARTLY_REFUNDED',
        refundedAmount,
        shippingMethod: 'STANDARD',
        subtotal,
        shippingCost: 0,
        discount: 0,
        total: subtotal,
        shippingAddress: { recipient, addressLine, city, state, zip, country, phone },
        trackingNumber: seed.tracking,
        courierName: seed.tracking ? 'DHL Express' : undefined,
        createdAt,
        items: { create: lines.map(({ watch, ...line }) => ({ ...line, watchId: watch.id, name: watch.name })) },
        events: { create: [{ status: initialStatus, createdAt }, ...(seed.status === initialStatus ? [] : [{ status: seed.status, createdAt: HOURS_AGO(seed.daysAgo * 24), actor: ADMIN_NAME }])] },
        refunds: { create: refunds.map(refund => ({ ...refund, method: seed.paymentMethod, createdAt: HOURS_AGO(seed.daysAgo * 12) })) },
        notes: { create: (seed.notes ?? []).map(body => ({ body, authorId: users.get('admin@watchhub.test')!.id })) },
      },
    });
    orderIds.push(order.id);
    if (seed.status !== 'CANCELLED') {
      await Promise.all(lines.map(({ watch, quantity }) => prisma.watch.update({ where: { id: watch.id }, data: { unitsSold: { increment: quantity } } })));
    }
  }

  await prisma.review.createMany({ data: REVIEWS.map(({ user, slug, ...review }) => ({ ...review, userId: users.get(user)!.id, watchId: watches.get(slug)!.id })) });
  await prisma.wishlistItem.createMany({
    data: [
      { userId: users.get('maya@watchhub.test')!.id, watchId: watches.get('kairos-chronos')!.id },
      { userId: users.get('maya@watchhub.test')!.id, watchId: watches.get('lunar-chrono')!.id },
    ],
  });
  await prisma.notification.create({ data: { userId: users.get('maya@watchhub.test')!.id, title: 'Order #2 update', body: 'Your order is on its way.', link: '/orders/2' } });

  const admin = users.get('admin@watchhub.test')!;
  const omar = users.get('omar@watchhub.test')!;
  const maya = users.get('maya@watchhub.test')!;
  const lena = users.get('lena@watchhub.test')!;
  const tickets = [
    {
      userId: omar.id,
      orderId: orderIds[2]!,
      subject: 'Can I swap the strap on my Lunar Chrono?',
      status: 'OPEN' as const,
      priority: 'NORMAL' as const,
      messages: [{ authorId: omar.id, kind: 'CUSTOMER' as const, message: 'I would love a black leather strap instead of the navy one. Is that possible after delivery?' }],
    },
    {
      userId: maya.id,
      orderId: orderIds[1]!,
      subject: 'Tracking number not updating',
      status: 'PENDING' as const,
      priority: 'HIGH' as const,
      messages: [
        { authorId: maya.id, kind: 'CUSTOMER' as const, message: 'My tracking has shown label created for two days. Is my order on its way?' },
        { authorId: admin.id, kind: 'INTERNAL' as const, message: 'Checked with DHL: the parcel was collected this morning, scan is delayed.' },
        { authorId: admin.id, kind: 'ADMIN' as const, message: 'Thanks for your patience. DHL collected the parcel this morning and tracking should update within 24 hours.' },
      ],
    },
    {
      userId: lena.id,
      subject: 'Strap sizing for Solitaire',
      status: 'RESOLVED' as const,
      priority: 'LOW' as const,
      messages: [
        { authorId: lena.id, kind: 'CUSTOMER' as const, message: 'Can you send the chain bracelet with one link removed?' },
        { authorId: admin.id, kind: 'ADMIN' as const, message: 'Done, we have packed a link remover tool and the spare links with your order.' },
        { authorId: lena.id, kind: 'CUSTOMER' as const, message: 'Perfect, thank you.' },
      ],
    },
  ];
  for (const { messages, ...ticket } of tickets) {
    await prisma.supportTicket.create({ data: { ...ticket, messages: { create: messages } } });
  }

  await prisma.stockAdjustment.createMany({
    data: [
      { watchId: watches.get('petite-mesh')!.id, variant: 'Rose Gold', delta: -4, newStock: 0, reason: 'Stock count', actor: ADMIN_NAME },
      { watchId: watches.get('cascade-bangle')!.id, variant: 'Silver', delta: 2, newStock: 3, reason: 'Restock delivery', actor: ADMIN_NAME },
    ],
  });
  await prisma.stockSubscription.create({ data: { watchId: watches.get('petite-mesh')!.id, email: 'maya@watchhub.test', userId: maya.id } });
  await prisma.newsletterSubscriber.createMany({ data: [{ email: 'maya@watchhub.test' }, { email: 'reader@example.com' }] });

  console.log(`Seeded ${ALL_WATCHES.length} watches, ${USERS.length} users and ${ORDERS.length} orders.`);
  console.log('Sign in with any @watchhub.test address, for example admin@watchhub.test. The password is set in prisma/seed.ts (override with SEED_PASSWORD).');
};

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
