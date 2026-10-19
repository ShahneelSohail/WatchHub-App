import { prisma, type Tx } from '../../lib/prisma';

export const notify = (userId: number, title: string, body: string, link?: string, db: Tx | typeof prisma = prisma) =>
  db.notification.create({ data: { userId, title, body, link } });
