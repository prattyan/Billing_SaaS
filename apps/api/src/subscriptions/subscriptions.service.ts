import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/subscription.dto';
import { PLAN_LIMITS, PLAN_PRICES, PlanTier } from '../types';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrent(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Shop not found');

    const limit = PLAN_LIMITS[tenant.planTier as PlanTier];
    const usagePercent = Math.round((tenant.skuCount / limit) * 100);

    return {
      currentTier: tenant.planTier,
      skuCount: tenant.skuCount,
      skuLimit: limit,
      usagePercent,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionExpiry: tenant.subscriptionExpiry,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt,
      history: tenant.subscriptions,
    };
  }

  async createOrder(tenantId: string, userId: string, dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { id: userId } } },
    });

    if (!tenant) throw new NotFoundException('Shop not found');
    const user = tenant.users[0];

    const price = PLAN_PRICES[dto.planTier];
    if (!price) throw new BadRequestException('Invalid plan tier for purchase');

    const orderId = `SUB_${tenant.slug.toUpperCase().slice(0, 8)}_${Date.now()}`;
    const appId = this.configService.get<string>('cashfree.appId');
    const secretKey = this.configService.get<string>('cashfree.secretKey');
    const env = this.configService.get<string>('cashfree.env', 'TEST');

    const baseUrl = env === 'PRODUCTION'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    let paymentSessionId = `mock_session_${uuidv4()}`;

    // If Cashfree credentials provided, make real API call
    if (appId && secretKey && appId.trim() !== '') {
      try {
        const response = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: price,
            order_currency: 'INR',
            customer_details: {
              customer_id: user?.id ?? tenant.id,
              customer_email: user?.email ?? 'shop@billingsaas.com',
              customer_phone: user?.phone ?? '9876543210',
              customer_name: user?.name ?? tenant.name,
            },
            order_meta: {
              return_url: `${this.configService.get<string>('app.baseUrl')}/subscription?order_id={order_id}`,
            },
            order_note: `Subscription upgrade to ${dto.planTier} for ${tenant.name}`,
          }),
        });

        const data = await response.json() as any;
        if (response.ok && data.payment_session_id) {
          paymentSessionId = data.payment_session_id;
        } else {
          this.logger.warn(`Cashfree API returned error, fallback to mock: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error(`Cashfree call failed: ${err.message}`);
      }
    }

    return {
      orderId,
      amount: price,
      currency: 'INR',
      planTier: dto.planTier,
      paymentSessionId,
      environment: env,
    };
  }

  async verifyAndUpgrade(tenantId: string, dto: VerifyPaymentDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Shop not found');

    // Extract target tier from order ID or pass in
    const appId = this.configService.get<string>('cashfree.appId');
    const secretKey = this.configService.get<string>('cashfree.secretKey');
    const env = this.configService.get<string>('cashfree.env', 'TEST');

    let paymentSuccess = true; // In test mode or when verified

    if (appId && secretKey && appId.trim() !== '') {
      try {
        const baseUrl = env === 'PRODUCTION'
          ? 'https://api.cashfree.com/pg'
          : 'https://sandbox.cashfree.com/pg';

        const res = await fetch(`${baseUrl}/orders/${dto.orderId}/payments`, {
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
          },
        });
        const payments = await res.json() as any[];
        const successful = Array.isArray(payments) && payments.some((p) => p.payment_status === 'SUCCESS');
        if (!successful) {
          paymentSuccess = false;
        }
      } catch (e: any) {
        this.logger.error(`Payment verification failed: ${e.message}`);
      }
    }

    if (!paymentSuccess) {
      throw new BadRequestException('Payment has not been completed or was declined');
    }

    // Determine target tier from previous state
    let newTier: PlanTier = 'GROWTH';
    if (tenant.planTier === 'STARTER') newTier = 'GROWTH';
    else if (tenant.planTier === 'GROWTH') newTier = 'BUSINESS';
    else if (tenant.planTier === 'BUSINESS') newTier = 'ENTERPRISE';
    else newTier = 'ENTERPRISE';

    const price = PLAN_PRICES[newTier as Exclude<PlanTier, 'STARTER'>] ?? 10000;
    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          planTier: newTier,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: expiry,
          gracePeriodEndsAt: null,
        },
      });

      const sub = await tx.subscription.create({
        data: {
          tenantId,
          planTier: newTier,
          amount: new Decimal(price),
          cashfreeOrderId: dto.orderId,
          cashfreePaymentId: dto.paymentId ?? `PAY_${Date.now()}`,
          startDate: now,
          endDate: expiry,
          status: 'ACTIVE',
        },
      });

      return {
        success: true,
        message: `Upgraded to ${newTier} plan! Expiry: ${expiry.toLocaleDateString()}`,
        subscription: sub,
        newPlanTier: newTier,
      };
    });
  }
}
