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

    // Check if there's a pending approval request
    const pendingRequest = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      currentTier: tenant.planTier,
      skuCount: tenant.skuCount,
      skuLimit: limit,
      usagePercent,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionExpiry: tenant.subscriptionExpiry,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt,
      pendingRequest: pendingRequest
        ? {
            id: pendingRequest.id,
            requestedPlanTier: (pendingRequest as any).requestedPlanTier,
            createdAt: pendingRequest.createdAt,
            status: pendingRequest.status,
          }
        : null,
      history: tenant.subscriptions,
    };
  }

  async createOrder(tenantId: string, userId: string, dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { id: userId } } },
    });

    if (!tenant) throw new NotFoundException('Shop not found');

    // Block if there's already a pending approval for this tenant
    const existingPending = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'PENDING_APPROVAL' },
    });
    if (existingPending) {
      throw new BadRequestException(
        `You already have a pending upgrade request for ${(existingPending as any).requestedPlanTier} plan awaiting super admin approval.`,
      );
    }

    const user = tenant.users[0];

    const price = PLAN_PRICES[dto.planTier];
    if (!price) throw new BadRequestException('Invalid plan tier for purchase');

    const orderId = `SUB_${tenant.slug.toUpperCase().slice(0, 8)}_${dto.planTier}_${Date.now()}`;
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

    // Priority 1: Direct planTier in DTO
    // Priority 2: Extract target tier from orderId (format: SUB_SLUG_TIER_timestamp)
    const tierFromOrderId = dto.orderId.split('_').slice(-2, -1)[0] as PlanTier;
    const VALID_TIERS: PlanTier[] = ['GROWTH', 'BUSINESS', 'ENTERPRISE'];

    let newTier: PlanTier;
    if (dto.planTier && VALID_TIERS.includes(dto.planTier)) {
      newTier = dto.planTier;
    } else if (tierFromOrderId && VALID_TIERS.includes(tierFromOrderId)) {
      newTier = tierFromOrderId;
    } else {
      this.logger.warn(`Could not extract tier from DTO or orderId "${dto.orderId}", falling back to one-step upgrade`);
      if (tenant.planTier === 'STARTER') newTier = 'GROWTH';
      else if (tenant.planTier === 'GROWTH') newTier = 'BUSINESS';
      else if (tenant.planTier === 'BUSINESS') newTier = 'ENTERPRISE';
      else newTier = 'ENTERPRISE';
    }

    // Validate the target tier is actually an upgrade
    const tierRank: Record<PlanTier, number> = { STARTER: 0, GROWTH: 1, BUSINESS: 2, ENTERPRISE: 3 };
    if (tierRank[newTier] <= tierRank[tenant.planTier as PlanTier]) {
      throw new BadRequestException(`Cannot downgrade from ${tenant.planTier} to ${newTier}`);
    }

    const appId = this.configService.get<string>('cashfree.appId');
    const secretKey = this.configService.get<string>('cashfree.secretKey');
    const env = this.configService.get<string>('cashfree.env', 'TEST');

    let paymentSuccess = true;

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

    const price = PLAN_PRICES[newTier as Exclude<PlanTier, 'STARTER'>] ?? 10000;
    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Create a PENDING_APPROVAL subscription record — plan is NOT activated yet
    // Super admin must approve before the tenant's planTier is updated
    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        planTier: tenant.planTier,          // current plan (unchanged until approved)
        requestedPlanTier: newTier,          // what they want to upgrade to
        amount: new Decimal(price),
        cashfreeOrderId: dto.orderId,
        cashfreePaymentId: dto.paymentId ?? `PAY_${Date.now()}`,
        startDate: now,
        endDate: expiry,
        status: 'PENDING_APPROVAL',
      } as any,
    });

    return {
      success: true,
      message: `Upgrade request for ${newTier} plan submitted. Awaiting super admin approval — your current plan remains active until approved.`,
      subscription: sub,
      newPlanTier: newTier,
      pendingApproval: true,
    };
  }
}
