import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

    return { message: `Shop ${tenant.name} purged successfully` };
  }
}
