import express, { Router } from 'express';
import type Stripe from 'stripe';
import { env } from '../../config/env';
import { asyncHandler, badRequest } from '../../lib/http';
import { getStripe } from '../../lib/stripe';
import { expireOrder, markPaid } from './order.service';

export const paymentRouter = Router();

paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!env.STRIPE_WEBHOOK_SECRET || typeof signature !== 'string') throw badRequest('Missing webhook signature.');

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw badRequest('Invalid webhook signature.');
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);
    if (orderId) {
      if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') await markPaid(orderId);
      if (event.type === 'checkout.session.expired') await expireOrder(orderId, session.id);
    }
    res.json({ received: true });
  })
);
