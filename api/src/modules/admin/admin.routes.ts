import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { analyticsAdminRouter } from './admin.analytics';
import { catalogAdminRouter } from './admin.catalog';
import { dashboardAdminRouter } from './admin.dashboard';
import { inventoryAdminRouter } from './admin.inventory';
import { orderAdminRouter } from './admin.orders';
import { peopleAdminRouter } from './admin.people';
import { watchAdminRouter } from './admin.watches';

export const adminRouter = Router();

adminRouter.use(...requireAdmin);
adminRouter.use(dashboardAdminRouter, analyticsAdminRouter, watchAdminRouter, inventoryAdminRouter, orderAdminRouter, peopleAdminRouter, catalogAdminRouter);
