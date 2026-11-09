import { badRequest } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { notify } from '../notifications/notification.service';
import { roundMoney } from './pricing';

interface RefundInput {
  amount: number;
  reason: string;
  actor: string;
}

const toCents = (value: number): number => Math.round(value * 100);

const stripePaymentIntent = async (sessionId: string): Promise<string> => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const intent = session.payment_intent;
  if (!intent) throw badRequest('This card payment has no charge to refund.', 'REFUND_NOT_POSSIBLE');
  return typeof intent === 'string' ? intent : intent.id;
};

export const issueRefund = async (orderId: number, { amount, reason, actor }: RefundInput): Promise<void> => {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTLY_REFUNDED') {
    throw badRequest('Only paid orders can be refunded.', 'REFUND_NOT_POSSIBLE');
  }
  const remaining = roundMoney(Number(order.total) - Number(order.refundedAmount));
  if (amount > remaining) throw badRequest(`The most you can refund is $${remaining.toFixed(2)}.`, 'REFUND_EXCEEDS_BALANCE', { max: remaining });

  const stripeRefundId =
    order.paymentMethod === 'STRIPE' && order.stripeSessionId
      ? (await getStripe().refunds.create({ payment_intent: await stripePaymentIntent(order.stripeSessionId), amount: toCents(amount) })).id
      : null;

  await prisma.$transaction(async tx => {
    const refundedAmount = roundMoney(Number(order.refundedAmount) + amount);
    await tx.refund.create({ data: { orderId, amount, reason, method: order.paymentMethod, stripeRefundId } });
    await tx.order.update({
      where: { id: orderId },
      data: { refundedAmount, paymentStatus: refundedAmount >= Number(order.total) ? 'REFUNDED' : 'PARTLY_REFUNDED' },
    });
    await tx.orderEvent.create({ data: { orderId, status: order.status, note: `Refunded $${amount.toFixed(2)} · ${reason}`, actor } });
    await notify(order.userId, `Refund for order #${orderId}`, `$${amount.toFixed(2)} has been refunded to you.`, `/orders/${orderId}`, tx);
  });
};
