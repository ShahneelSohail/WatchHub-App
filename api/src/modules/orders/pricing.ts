import type { Coupon, ShippingMethod } from '@prisma/client';
import { badRequest } from '../../lib/http';
import { prisma } from '../../lib/prisma';

export const SHIPPING_COSTS: Record<ShippingMethod, number> = { STANDARD: 0, EXPRESS: 25 };

export const COD_LIMIT = 3000;

export const codUnavailableReason = (total: number): string | null =>
  total >= COD_LIMIT
    ? `Cash on delivery is available for orders under $${COD_LIMIT.toLocaleString('en-US')}. This order is $${total.toLocaleString('en-US')}.`
    : null;

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const findUsableCoupon = async (code: string, subtotal: number, userId: number): Promise<Coupon> => {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive) throw badRequest('That coupon code is not valid.', 'COUPON_INVALID');
  if (coupon.startsAt && coupon.startsAt > now) throw badRequest('That coupon is not active yet.', 'COUPON_NOT_STARTED');
  if (coupon.expiresAt && coupon.expiresAt < now) throw badRequest('That coupon has expired.', 'COUPON_EXPIRED');
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw badRequest('That coupon has been fully redeemed.', 'COUPON_EXHAUSTED');
  if (coupon.minAmount !== null && subtotal < Number(coupon.minAmount)) {
    throw badRequest(`Spend at least $${Number(coupon.minAmount).toFixed(2)} to use this coupon.`, 'COUPON_MIN_NOT_MET', { minAmount: Number(coupon.minAmount) });
  }
  if (coupon.limitPerUser !== null) {
    const used = await prisma.order.count({ where: { userId, couponId: coupon.id, status: { not: 'CANCELLED' } } });
    if (used >= coupon.limitPerUser) throw badRequest('You have already used this coupon the maximum number of times.', 'COUPON_LIMIT_PER_USER');
  }
  return coupon;
};

export const couponDiscount = (coupon: Coupon, subtotal: number): number =>
  roundMoney(coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Math.min(Number(coupon.value), subtotal));

export const orderTotals = (subtotal: number, shippingMethod: ShippingMethod, discount: number) => {
  const shippingCost = SHIPPING_COSTS[shippingMethod];
  return { subtotal: roundMoney(subtotal), shippingCost, discount, total: roundMoney(subtotal + shippingCost - discount) };
};
