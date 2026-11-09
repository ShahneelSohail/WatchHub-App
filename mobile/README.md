# WatchHub mobile

Expo (React Native, TypeScript, expo-router) customer app for the WatchHub API. The visual design follows the Blue 390px mobile frames.

## Install

```
npm install
```

## Configure

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the WatchHub API origin. On a physical device use your computer's LAN address, for example `http://192.168.1.20:4100`. Catalogue photos are served by the API under `/watches/*`.

## Run

```
npx expo start
```

Then press `i`, `a` or `w`, or scan the QR code with a development build.

## Notes

- Login and register return a bearer token, kept in `expo-secure-store` (`localStorage` on web) and sent as `Authorization: Bearer`.
- Card payments open Stripe Checkout in an in-app auth session. The API redirects to `watchhub://orders/{orderId}?status=paid|cancelled`, then the app calls `/api/orders/:id/confirm-payment` and shows the payment result screen. Deep links need a development build (the `watchhub` scheme).
- Tabs: Home, Watches, Search, Saved, Bag. The header bag icon opens the bag drawer; the Bag tab is the full bag page.
- Type check with `npm run typecheck`.
