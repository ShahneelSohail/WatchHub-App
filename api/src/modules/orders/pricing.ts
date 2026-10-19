import type { Coupon, ShippingMethod } from '@prisma/client';
import { badRequest } from '../../lib/http';
import { prisma } from '../../lib/prisma';

export const SHIPPING_COSTS: Record<ShippingMethod, number> = { STANDARD: 0, EXPRESS: 25 };

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const findUsableCoupon = async (code: string, subtotal: number, userId: number): Promise<Coupon> => {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive) throw badRequest('That coupon code is not valid.');
  if (coupon.startsAt && coupon.startsAt > now) throw badRequest('That coupon is not active yet.');
  if (coupon.expiresAt && coupon.expiresAt < now) throw badRequest('That coupon has expired.');
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw badRequest('That coupon has been fully redeemed.');
  if (coupon.minAmount !== null && subtotal < Number(coupon.minAmount)) throw badRequest(`Spend at least $${Number(coupon.minAmount).toFixed(2)} to use this coupon.`);
  if (coupon.limitPerUser !== null) {
    const used = await prisma.order.count({ where: { userId, couponId: coupon.id, status: { not: 'CANCELLED' } } });
    if (used >= coupon.limitPerUser) throw badRequest('You have already used this coupon the maximum number of times.');
  }
  return coupon;
};

export const couponDiscount = (coupon: Coupon, subtotal: number): number =>
  roundMoney(coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Math.min(Number(coupon.value), subtotal));

export const orderTotals = (subtotal: number, shippingMethod: ShippingMethod, discount: number) => {
  const shippingCost = SHIPPING_COSTS[shippingMethod];
  return { subtotal: roundMoney(subtotal), shippingCost, discount, total: roundMoney(subtotal + shippingCost - discount) };
};
