import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env';
import { UPLOAD_DIR } from './lib/upload';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { reviewRouter } from './modules/catalog/review.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { checkoutRouter, orderRouter } from './modules/orders/order.routes';
import { paymentRouter } from './modules/orders/payment.routes';
import { addressRouter } from './modules/shop/address.routes';
import { cartRouter } from './modules/shop/cart.routes';
import { wishlistRouter } from './modules/shop/wishlist.routes';
import { supportRouter } from './modules/support/support.routes';

export const createApp = () => {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use('/api/payments', paymentRouter);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/watches', reviewRouter);
  app.use('/api', catalogRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/addresses', addressRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/support', supportRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
