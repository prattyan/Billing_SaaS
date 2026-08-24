import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantByAdminDto, OverridePlanDto, ToggleTenantStatusDto } from './dto/superadmin.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalBills,
      totalRevenueData,
      planDistribution,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.bill.count(),
      this.prisma.bill.aggregate({
        where: { status: 'PAID' },
        _sum: { grandTotal: true },
      }),
      this.prisma.tenant.groupBy({
        by: ['planTier'],
        _count: { id: true },
      }),
    ]);

    const subscriptionRevenue = await this.prisma.subscription.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { amount: true },
    });

    return {
      overview: {
        totalTenants,
        activeTenants,
        totalUsers,
        totalBills,
        grossProcessedGMV: totalRevenueData._sum.grandTotal ?? 0,
        saasSubscriptionRevenue: subscriptionRevenue._sum.amount ?? 0,
      },
      planDistribution,
    };
  }

  async getAllTenants(query: { search?: string; planTier?: string }) {
    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { slug: { contains: query.search } },
      ];
    }
    if (query.planTier) {
      where.planTier = query.planTier;
    }

    return this.prisma.tenant.findMany({
      where,
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: {
          select: { items: true, bills: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(dto: CreateTenantByAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const baseSlug = dto.shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${uuidv4().slice(0, 6)}`;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const planTier = dto.planTier ?? 'STARTER';

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          slug,
          planTier,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.shopSettings.create({
        data: {
          tenantId: tenant.id,
          gstin: dto.gstin ?? null,
          billPrefix: slug.slice(0, 4).toUpperCase(),
          requireCustomerPhone: false,
          whatsappEnabled: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          name: dto.ownerName,
          phone: dto.phone ?? null,
          passwordHash,
          role: 'OWNER',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return {
      message: 'Shop created successfully',
      tenant: result.tenant,
      owner: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    };
  }

  async overridePlan(tenantId: string, dto: OverridePlanDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const data: any = {
      planTier: dto.planTier,
    };

    if (dto.subscriptionStatus) data.subscriptionStatus = dto.subscriptionStatus;
    if (dto.subscriptionExpiry) data.subscriptionExpiry = new Date(dto.subscriptionExpiry);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async toggleStatus(tenantId: string, dto: ToggleTenantStatusDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: dto.isActive },
    });
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Cascade delete tenant records
    await this.prisma.$transaction(async (tx) => {
      await tx.billItem.deleteMany({ where: { bill: { tenantId } } });
      await tx.bill.deleteMany({ where: { tenantId } });
      await tx.stockTransaction.deleteMany({ where: { tenantId } });
      await tx.poItem.deleteMany({ where: { purchaseOrder: { tenantId } } });
      await tx.purchaseOrder.deleteMany({ where: { tenantId } });
      await tx.item.deleteMany({ where: { tenantId } });
      await tx.category.deleteMany({ where: { tenantId } });
      await tx.supplier.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.notificationLog.deleteMany({ where: { tenantId } });
      await tx.subscription.deleteMany({ where: { tenantId } });
      await tx.shopSettings.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    return { message: `Shop ${tenant.name} permanently purged successfully` };
  }

  async restoreTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isDeleted: false,
          deletedAt: null,
          scheduledDeletionAt: null,
          isActive: true,
        } as any,
      }),
      this.prisma.user.updateMany({
        where: { tenantId },
        data: { isActive: true },
      }),
    ]);

    return { message: `Shop "${tenant.name}" has been fully recovered! All data, inventory, bills, customers, and billers are active.` };
  }

  async purgeExpiredTenants() {
    const expiredTenants = await (this.prisma.tenant as any).findMany({
      where: {
        isDeleted: true,
        scheduledDeletionAt: { lte: new Date() },
      },
      select: { id: true, name: true },
    });

    for (const t of expiredTenants) {
      await this.deleteTenant(t.id);
    }

    return { purgedCount: expiredTenants.length };
  }

  // ──────────────────────────────────────────────
  // SUBSCRIPTION APPROVAL WORKFLOW
  // ──────────────────────────────────────────────

  async getPendingApprovals() {
    return this.prisma.subscription.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            planTier: true,
            skuCount: true,
            users: {
              where: { role: 'OWNER' },
              select: { name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveUpgrade(subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!sub) throw new NotFoundException('Subscription request not found');
    if (sub.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot approve a subscription with status "${sub.status}"`);
    }
    if (!(sub as any).requestedPlanTier) {
      throw new BadRequestException('Subscription has no requested plan tier');
    }

    const { PLAN_LIMITS } = await import('../types');
    const newTier = (sub as any).requestedPlanTier;
    const expiry = sub.endDate;

    return this.prisma.$transaction(async (tx) => {
      // Activate the subscription
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          planTier: newTier,
          approvedAt: new Date(),
        } as any,
      });

      // Reject any other pending requests for this tenant
      await tx.subscription.updateMany({
        where: {
          tenantId: sub.tenantId,
          status: 'PENDING_APPROVAL',
          id: { not: subscriptionId },
        },
        data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: 'Superseded by newer request' } as any,
      });

      // Update the tenant's plan
      await tx.tenant.update({
        where: { id: sub.tenantId },
        data: {
          planTier: newTier,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: expiry,
          gracePeriodEndsAt: null,
        },
      });

      return {
        success: true,
        message: `Shop "${sub.tenant.name}" upgraded to ${newTier} plan successfully`,
        newPlanTier: newTier,
      };
    });
  }

  async rejectUpgrade(subscriptionId: string, reason?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!sub) throw new NotFoundException('Subscription request not found');
    if (sub.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot reject a subscription with status "${sub.status}"`);
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason ?? 'Rejected by super admin',
      } as any,
    });

    return {
      success: true,
      message: `Upgrade request for "${sub.tenant.name}" has been rejected`,
    };
  }
}
