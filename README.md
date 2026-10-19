# WatchHub

An online watch store with a customer storefront and an admin console: browse and filter watches, pick colours and straps, check out with Stripe or cash on delivery, and manage products, orders, customers, coupons and support from the admin side.

> **Status:** the overhaul is complete: a Next.js and TypeScript web app, an Express, Prisma and PostgreSQL API, and Stripe Checkout in test mode. The original Flutter and Firebase application, built as a team project at Aptech, is kept in [`legacy/`](legacy).

![Storefront](docs/screenshots/home.webp)

## The overhaul

| Part | Stack |
|---|---|
| [`web/`](web) | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| [`api/`](api) | Express 4, TypeScript, Prisma 6, PostgreSQL, zod validation, cookie-based JWT sessions, multer uploads, rate limiting, Stripe |
| Tests | Vitest and supertest for the API (against an embedded PostgreSQL), Playwright end-to-end tests for the web app |

**Highlights**

- Orders are placed inside a transaction that reserves stock with conditional updates, so the last watch can never be sold twice. Cancelling an order, or letting a card payment session expire, returns the stock and the coupon use.
- **Stripe Checkout (test mode)** for card payments: the API creates the session, a signed webhook confirms the payment (idempotently), and a "confirm payment" call covers local setups without the webhook. Cash on delivery is supported too. Card payments switch off automatically when no Stripe key is configured.
- Storefront: search with brand, category, price and stock filters, colour variants that swap the product photo, optional belt or chain straps, wishlist, cart, coupons, free or express shipping, order tracking with a timeline, verified-purchase reviews, notifications and support tickets.
- Admin console: sales dashboard, product editor with image uploads, order fulfilment (confirm, ship with tracking, deliver, cancel), customers (block, promote), review moderation and replies, coupons, brands and categories, home banners, FAQs and a support inbox.
- Sessions are httpOnly cookies, login and registration are rate limited, every request body is validated with zod, and uploads are limited by type and size.

![Admin dashboard](docs/screenshots/admin-dashboard.webp)

More screenshots: [catalogue](docs/screenshots/catalog.webp), [product page](docs/screenshots/product.webp), [checkout](docs/screenshots/checkout.webp), [order fulfilment](docs/screenshots/admin-order.webp), [product editor](docs/screenshots/admin-product-form.webp).

### Running it

You need Node.js 20 or newer.

```bash
cd api
cp .env.example .env        # set JWT_SECRET (instructions inside)
npm install
npm run db:dev              # local PostgreSQL on :5432 (or run `docker compose up -d` in the repo root)
npm run db:push && npm run db:seed
npm run dev                 # API on http://localhost:4000
```

```bash
cd web
cp .env.example .env
npm install
npm run dev                 # web app on http://localhost:3000
```

The seed creates 13 watches, demo orders and accounts such as `admin@watchhub.test` and `maya@watchhub.test`; the shared demo password is in [`api/prisma/seed.ts`](api/prisma/seed.ts). It is for local development only.

If something else already uses port 4000, change `PORT` in `api/.env`, set `API_URL` in `web/.env` to match, and run `npm run build` again, because Next.js bakes the proxy target in at build time.

### Card payments with Stripe (optional)

1. Create a free Stripe account and copy your **test mode** secret key (`sk_test_...`) into `STRIPE_SECRET_KEY` in `api/.env`. Never use live keys here and never commit `.env`.
2. For automatic payment confirmation, run `stripe listen --forward-to localhost:4000/api/payments/webhook` with the [Stripe CLI](https://docs.stripe.com/stripe-cli) and put the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET`.
3. Restart the API. The checkout page now offers "Credit or debit card"; pay with the test card `4242 4242 4242 4242` and any future expiry and CVC.

Without step 2 the order page still confirms the payment when you return from Stripe, by asking Stripe for the session.

### Tests

```bash
cd api && npm test                    # 49 API tests, embedded PostgreSQL, no setup needed
cd web && npm run test:e2e            # needs the API (seeded) and web app running
```

Set `BASE_URL` to the web app's address if it is not on port 3000, and `CHROMIUM_PATH` to a Chrome or Chromium executable if Playwright's own browsers are not installed. The Stripe code is covered by tests that fake the Stripe client and send correctly signed webhook payloads; the hosted Stripe page itself is not automated.

## The original application (in `legacy/`)

- **Stack:** Flutter (Dart) mobile and web app, Firebase (Firestore, Authentication, Storage, Cloud Functions), Cloudinary for images, Stripe, Provider for state management.
- **Roles:** customers and administrators, each with their own screens.
- **Features:** product catalogue with brands, categories, colour and strap options, search and filters, wishlist and cart, checkout with Stripe or cash on delivery, order tracking, reviews, support tickets and FAQs, plus an admin panel with a sales dashboard, inventory, order management, coupons, banners, push notifications, audit logs and tax and shipping settings.
- **Documentation:** the team's original README, with its screenshots, is in [`Documentation/ORIGINAL_README.md`](Documentation/ORIGINAL_README.md).

### Running the original

1. Install Flutter 3 and create your own Firebase project; add its configuration to `legacy/lib/firebase_options.dart`.
2. Copy `legacy/.env.example` to `legacy/.env` and add your own Cloudinary values.
3. From `legacy`, run `flutter pub get` and `flutter run`.

## Credits

| Contributor | Part in this repository (from the commit history) |
|---|---|
| **S A M E E R** ([Konete326](https://github.com/Konete326), original repository: [Konete326/WatchHub](https://github.com/Konete326/WatchHub)) | Original author of the application: structure, models, services, the customer and admin screens, UI and UX polish, documentation. 26 of the 33 commits in the original history. |
| **Shahneel Sohail** (commits as `Neel455`, `Shahneeel` and `Shahneel Sohail`) | Cloudinary image service, strap and colour options for cart and orders, banner and watch management improvements, project clean-up. The overhaul in `api/` and `web/`. |
| **maazasad86** | Initial commits, including the brand data fix. |

The original README lists the development team as Muhammad Sameer, Maaz Bin Asad, Arham, Ibad Ullah and Shahneel.

### Third-party assets

The watch photographs in `web/public/watches` come from the original project's `assets/images`, resized and converted to WebP. Brand names in the seed data are fictional. Check the licence of the photographs before any commercial use.

## History note

Generated build output (`build/`, `.dart_tool/` including a browser profile), local `.env` files and a Cloudinary secret were removed from this repository's history. Authors, dates and commit messages were preserved. The Cloudinary key that appeared in the original history must be treated as compromised and rotated by its owner.
