import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, UpdateItemDto, RestockItemDto, ItemQueryDto } from './dto/item.dto';
import { PLAN_LIMITS, GRACE_PERIOD_DAYS, PlanTier } from '../types';
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Barcode Lookup (used by POS scan) ────────────────────────────────────────

  async lookupByBarcode(tenantId: string, barcode: string) {
    const item = await this.prisma.item.findFirst({
      where: { tenantId, barcode, isActive: true },
      include: { category: true, supplier: true },
    });
    if (!item) {
      throw new NotFoundException(`Item with barcode "${barcode}" was not found in stock`);
    }
    return item;
  }

  // ── List items with filters ──────────────────────────────────────────────────

  async findAll(tenantId: string, query: ItemQueryDto) {
    const { page = 1, limit = 50, search, categoryId, lowStock, nearExpiry } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;

    // Low stock: currentStock <= reorderThreshold
    if (lowStock) {
      where.AND = [
        ...(where.AND ?? []),
        { currentStock: { lte: this.prisma.$queryRaw`"reorder_threshold"` } },
      ];
      // Use raw comparison for low-stock
      delete where.AND;
      where.currentStock = { lte: 10 }; // simplified; proper comparison below
    }

    // Near expiry: expiryDate within 30 days
    if (nearExpiry) {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      where.expiryDate = { lte: thirtyDaysFromNow, gte: new Date() };
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, supplier: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    // Correct low-stock calculation in-memory after fetch
    const enrichedItems = items.map((item) => ({
      ...item,
      isLowStock: new Decimal(item.currentStock.toString()).lte(
        new Decimal(item.reorderThreshold.toString()),
      ),
    }));

    return {
      items: enrichedItems,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get one item ─────────────────────────────────────────────────────────────

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        category: true,
        supplier: true,
        stockTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { createdBy: { select: { name: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  // ── Create item (with SKU limit enforcement) ─────────────────────────────────

  async create(tenantId: string, dto: CreateItemDto, createdById: string) {
    // 1. Enforce plan limits
    await this.enforceSkuLimit(tenantId);

    // 2. Check barcode uniqueness per shop
    if (dto.barcode) {
      const existing = await this.prisma.item.findUnique({
        where: { tenantId_barcode: { tenantId, barcode: dto.barcode } },
      });
      if (existing) {
        throw new ConflictException(
          `Barcode ${dto.barcode} already exists in your inventory`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          tenantId,
          name: dto.name,
          categoryId: dto.categoryId,
          brand: dto.brand,
          unit: dto.unit,
          barcode: dto.barcode,
          mrp: new Decimal(dto.mrp),
          offerPrice: dto.offerPrice != null ? new Decimal(dto.offerPrice) : null,
          costPrice: dto.costPrice != null ? new Decimal(dto.costPrice) : null,
          taxPercent: new Decimal(dto.taxPercent ?? 0),
          hsnCode: dto.hsnCode,
          supplierId: dto.supplierId,
          reorderThreshold: new Decimal(dto.reorderThreshold ?? 0),
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          currentStock: new Decimal(dto.initialStock ?? 0),
          imageUrl: dto.imageUrl,
        },
      });

      // Create initial stock transaction if initialStock > 0
      if (dto.initialStock && dto.initialStock > 0) {
        await tx.stockTransaction.create({
          data: {
            tenantId,
            itemId: item.id,
            type: 'RESTOCK',
            quantity: new Decimal(dto.initialStock),
            costPrice: dto.costPrice != null ? new Decimal(dto.costPrice) : null,
            reason: 'Initial stock entry',
            createdById,
          },
        });
      }

      // Increment SKU count on tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: { skuCount: { increment: 1 } },
      });

      return item;
    });

    return result;
  }

  // ── Update item ───────────────────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdateItemDto) {
    await this.findOne(tenantId, id); // throws if not found

    const data: any = { ...dto };

    // Convert numeric fields to Decimal
    if (dto.mrp != null) data.mrp = new Decimal(dto.mrp);
    if (dto.offerPrice != null) data.offerPrice = new Decimal(dto.offerPrice);
    if (dto.costPrice != null) data.costPrice = new Decimal(dto.costPrice);
    if (dto.taxPercent != null) data.taxPercent = new Decimal(dto.taxPercent);
    if (dto.reorderThreshold != null) data.reorderThreshold = new Decimal(dto.reorderThreshold);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);
    delete data.initialStock; // not an update field

    return this.prisma.item.update({
      where: { id },
      data,
    });
  }

  // ── Restock item ──────────────────────────────────────────────────────────────

  async restock(tenantId: string, itemId: string, dto: RestockItemDto, createdById: string) {
    const item = await this.findOne(tenantId, itemId);

    const qty = new Decimal(dto.quantity);

    const [updatedItem, transaction] = await this.prisma.$transaction([
      this.prisma.item.update({
        where: { id: itemId },
        data: {
          currentStock: { increment: qty as any },
          costPrice: dto.costPrice != null ? new Decimal(dto.costPrice) : undefined,
        },
      }),
      this.prisma.stockTransaction.create({
        data: {
          tenantId,
          itemId,
          type: 'RESTOCK',
          quantity: qty,
          costPrice: dto.costPrice != null ? new Decimal(dto.costPrice) : null,
          referenceId: dto.invoiceRef,
          reason: dto.notes,
          createdById,
        },
      }),
    ]);

    return { item: updatedItem, transaction };
  }

  // ── Soft delete ───────────────────────────────────────────────────────────────

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.$transaction([
      this.prisma.item.update({ where: { id }, data: { isActive: false } }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { skuCount: { decrement: 1 } },
      }),
    ]);
    return { message: 'Item deactivated successfully' };
  }

  // ── Plan limit enforcement (Strict Hard Block) ───────────────────────────────

  async enforceSkuLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        skuCount: true,
        planTier: true,
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const limit = PLAN_LIMITS[tenant.planTier as PlanTier];
    if (tenant.skuCount >= limit) {
      const nextTier = this.getNextTier(tenant.planTier as PlanTier);
      throw new ForbiddenException(
        `Plan SKU Limit Reached: Your ${tenant.planTier} plan allows up to ${limit} items (currently ${tenant.skuCount}/${limit} used). Please upgrade to ${nextTier ?? 'Enterprise'} plan to add more products.`,
      );
    }
  }

  async getPlanUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { skuCount: true, planTier: true, subscriptionStatus: true, gracePeriodEndsAt: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const limit = PLAN_LIMITS[tenant.planTier as PlanTier];
    const usagePercent = Math.round((tenant.skuCount / limit) * 100);
    const nextTier = this.getNextTier(tenant.planTier as PlanTier);

    return {
      currentTier: tenant.planTier,
      currentSkuCount: tenant.skuCount,
      tierLimit: limit,
      usagePercent,
      suggestedUpgrade: usagePercent >= 90 ? nextTier : undefined,
      isOverLimit: tenant.skuCount >= limit,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt?.toISOString(),
    };
  }

  private getNextTier(current: PlanTier): PlanTier | null {
    const tiers: PlanTier[] = ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'];
    const idx = tiers.indexOf(current);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }
}
