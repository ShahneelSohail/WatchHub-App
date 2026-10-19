import fs from 'node:fs/promises';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { UPLOAD_DIR } from './lib/upload';

const main = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const server = createApp().listen(env.PORT, () => {
    console.log(`WatchHub API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
