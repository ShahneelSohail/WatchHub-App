import Stripe from 'stripe';
import { vi } from 'vitest';

export const stripeFake = {
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  coupons: { create: vi.fn() },
  webhooks: new Stripe('sk_test_dummy_key_for_tests').webhooks,
};

export const getStripe = () => stripeFake;
