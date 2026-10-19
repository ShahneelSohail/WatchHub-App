import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { catalogAdminRouter } from './admin.catalog';
import { dashboardAdminRouter } from './admin.dashboard';
import { orderAdminRouter } from './admin.orders';
import { peopleAdminRouter } from './admin.people';
import { watchAdminRouter } from './admin.watches';

export const adminRouter = Router();

adminRouter.use(...requireAdmin);
adminRouter.use(dashboardAdminRouter, watchAdminRouter, orderAdminRouter, peopleAdminRouter, catalogAdminRouter);
