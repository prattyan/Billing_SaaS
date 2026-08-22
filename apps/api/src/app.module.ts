import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { ItemsModule } from './items/items.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StockModule } from './stock/stock.module';
import { BillingModule } from './billing/billing.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { UsersModule } from './users/users.module';
import { appConfig, databaseConfig, jwtConfig, cashfreeConfig, whatsappConfig } from './config';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, cashfreeConfig, whatsappConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 second
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200,
      },
    ]),

    // Core infrastructure
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    ItemsModule,
    CategoriesModule,
    SuppliersModule,
    StockModule,
    BillingModule,
    CustomersModule,
    ReportsModule,
    SubscriptionsModule,
    NotificationsModule,
    SuperAdminModule,
  ],
})
export class AppModule {}
