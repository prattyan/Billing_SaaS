export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `var` declarations (needed for Next.js HMR in dev)
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client.
 * In development, re-use the global instance to avoid exhausting DB connections
 * during Next.js hot-module replacement.
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
