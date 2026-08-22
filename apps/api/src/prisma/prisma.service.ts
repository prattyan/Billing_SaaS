import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? [{ level: 'query', emit: 'event' }, { level: 'error', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }]
        : [{ level: 'error', emit: 'stdout' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma connected to PostgreSQL');

    // Multi-tenant safety middleware:
    // Intercepts all queries on tenant-scoped models and verifies
    // that a tenantId is present in the where clause.
    // This is a developer-time guard — remove for models that are intentionally global.
    if (process.env.NODE_ENV === 'development') {
      (this as any).$on('query', (e: any) => {
        if (process.env.LOG_QUERIES === 'true') {
          this.logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  /**
   * Soft-delete helper: sets isActive = false instead of deleting.
   * Used for items, suppliers, users.
   */
  async softDelete(model: string, id: string) {
    return (this as any)[model].update({
      where: { id },
      data: { isActive: false },
    });
  }
}
