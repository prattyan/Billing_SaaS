import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  private dashboardCache = new Map<string, { timestamp: number; data: any }>();

  constructor(private readonly prisma: PrismaService) {}

  // ── Dashboard summary ─────────────────────────────────────────────────────────

  async getDashboardSummary(tenantId?: string | null) {
    const cacheKey = tenantId || 'global';
    const cached = this.dashboardCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < 10000) {
      return cached.data;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const tenantFilter = tenantId ? { tenantId } : {};

    const [todaySales, monthSales, totalItems, allItems, todayBillItems] =
      await Promise.all([
        // Today's sales
        this.prisma.bill.aggregate({
          where: { ...tenantFilter, status: 'PAID', createdAt: { gte: startOfToday } },
          _sum: { grandTotal: true },
          _count: { id: true },
        }),
        // This month's sales
        this.prisma.bill.aggregate({
          where: { ...tenantFilter, status: 'PAID', createdAt: { gte: startOfMonth } },
          _sum: { grandTotal: true },
          _count: { id: true },
        }),
        // Total active items
        this.prisma.item.count({ where: { ...tenantFilter, isActive: true } }),
        // All items to accurately calculate low stock & near expiry
        this.prisma.item.findMany({
          where: { ...tenantFilter, isActive: true },
          select: { currentStock: true, reorderThreshold: true, expiryDate: true },
        }),
        // Today's sold items for top 5 list
        this.prisma.billItem.findMany({
          where: {
            bill: {
              ...tenantFilter,
              status: 'PAID',
              createdAt: { gte: startOfToday },
            },
          },
          select: { itemId: true, itemNameAtSale: true, qty: true, lineTotal: true },
        }),
      ]);

    const lowStockItems = allItems.filter((item) =>
      new Decimal(item.currentStock.toString()).lte(new Decimal(item.reorderThreshold.toString())),
    ).length;

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const nearExpiryItems = allItems.filter(
      (item) => item.expiryDate && item.expiryDate <= thirtyDaysFromNow && item.expiryDate >= new Date(),
    ).length;

    // Aggregate top items today in memory
    const topItemMap = new Map<string, { itemId: string; itemNameAtSale: string; qty: number; lineTotal: number }>();
    for (const bi of todayBillItems) {
      const existing = topItemMap.get(bi.itemId);
      const qtyNum = Number(bi.qty);
      const totalNum = Number(bi.lineTotal);
      if (existing) {
        existing.qty += qtyNum;
        existing.lineTotal += totalNum;
      } else {
        topItemMap.set(bi.itemId, {
          itemId: bi.itemId,
          itemNameAtSale: bi.itemNameAtSale,
          qty: qtyNum,
          lineTotal: totalNum,
        });
      }
    }
    const topItemsToday = Array.from(topItemMap.values())
      .sort((a, b) => b.lineTotal - a.lineTotal)
      .slice(0, 5);

    // ── Real-time 7-day weekly revenue calculation from PostgreSQL ───────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyBills = await this.prisma.bill.findMany({
      where: {
        ...tenantFilter,
        status: 'PAID',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        grandTotal: true,
        createdAt: true,
      },
    });

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyRevenue: { day: string; date: string; revenue: number; bills: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayBills = weeklyBills.filter(
        (b) => b.createdAt >= dayStart && b.createdAt <= dayEnd,
      );

      const dayRevenue = dayBills.reduce(
        (acc, b) => acc.plus(new Decimal(b.grandTotal.toString())),
        new Decimal(0),
      );

      weeklyRevenue.push({
        day: daysOfWeek[d.getDay()],
        date: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
        revenue: dayRevenue.toNumber(),
        bills: dayBills.length,
      });
    }

    const result = {
      today: {
        revenue: todaySales._sum.grandTotal ?? 0,
        bills: todaySales._count.id,
      },
      month: {
        revenue: monthSales._sum.grandTotal ?? 0,
        bills: monthSales._count.id,
      },
      inventory: {
        totalItems,
        lowStockItems,
        nearExpiryItems,
      },
      topItemsToday,
      weeklyRevenue,
    };

    this.dashboardCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  // ── Sales report (date range) ─────────────────────────────────────────────────

  async getSalesReport(tenantId: string | null, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const tenantFilter = tenantId ? { tenantId } : {};

    const bills = await this.prisma.bill.findMany({
      where: {
        ...tenantFilter,
        status: 'PAID',
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: true,
        customer: { select: { name: true, phone: true } },
        biller: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = bills.reduce(
      (sum, b) => sum.plus(new Decimal(b.grandTotal.toString())),
      new Decimal(0),
    );
    const totalTax = bills.reduce(
      (sum, b) => sum.plus(new Decimal(b.taxTotal.toString())),
      new Decimal(0),
    );

    return {
      bills,
      summary: {
        totalBills: bills.length,
        totalRevenue: totalRevenue.toDecimalPlaces(2),
        totalTax: totalTax.toDecimalPlaces(2),
        netRevenue: totalRevenue.minus(totalTax).toDecimalPlaces(2),
      },
    };
  }

  // ── Best-selling items ────────────────────────────────────────────────────────

  async getBestSellingItems(tenantId: string | null, from: string, to: string, limit = 20) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const tenantFilter = tenantId ? { tenantId } : {};

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          ...tenantFilter,
          status: 'PAID',
          createdAt: { gte: fromDate, lte: toDate },
        },
      },
      select: { itemId: true, itemNameAtSale: true, qty: true, lineTotal: true },
    });

    const itemMap = new Map<string, { itemId: string; itemNameAtSale: string; _sum: { qty: number; lineTotal: number }; _count: { id: number } }>();
    for (const bi of billItems) {
      const existing = itemMap.get(bi.itemId);
      const q = Number(bi.qty);
      const t = Number(bi.lineTotal);
      if (existing) {
        existing._sum.qty += q;
        existing._sum.lineTotal += t;
        existing._count.id += 1;
      } else {
        itemMap.set(bi.itemId, {
          itemId: bi.itemId,
          itemNameAtSale: bi.itemNameAtSale,
          _sum: { qty: q, lineTotal: t },
          _count: { id: 1 },
        });
      }
    }

    return Array.from(itemMap.values())
      .sort((a, b) => b._sum.qty - a._sum.qty)
      .slice(0, limit);
  }

  // ── Low stock alerts ──────────────────────────────────────────────────────────

  async getLowStockItems(tenantId: string | null) {
    const tenantFilter = tenantId ? { tenantId } : {};

    const items = await this.prisma.item.findMany({
      where: { ...tenantFilter, isActive: true },
      include: { category: true },
      orderBy: { currentStock: 'asc' },
    });

    return items.filter((item) =>
      new Decimal(item.currentStock.toString()).lte(
        new Decimal(item.reorderThreshold.toString()),
      ),
    );
  }

  // ── Tax collected report ──────────────────────────────────────────────────────

  async getTaxReport(tenantId: string | null, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const tenantFilter = tenantId ? { tenantId } : {};

    const bills = await this.prisma.bill.findMany({
      where: {
        ...tenantFilter,
        status: 'PAID',
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: { items: true },
    });

    const taxSummary: Record<string, { taxableAmount: Decimal; cgst: Decimal; sgst: Decimal; igst: Decimal; totalTax: Decimal }> = {};

    for (const bill of bills) {
      for (const item of bill.items) {
        const rate = (item.taxPercentAtSale ?? 0).toString();
        if (!taxSummary[rate]) {
          taxSummary[rate] = {
            taxableAmount: new Decimal(0),
            cgst: new Decimal(0),
            sgst: new Decimal(0),
            igst: new Decimal(0),
            totalTax: new Decimal(0),
          };
        }
        const lineTotal = new Decimal(item.lineTotal.toString());
        const taxAmount = new Decimal((item.taxAmount ?? 0).toString());
        const halfTax = taxAmount.dividedBy(2);

        taxSummary[rate].taxableAmount = taxSummary[rate].taxableAmount.plus(lineTotal.minus(taxAmount));
        taxSummary[rate].cgst = taxSummary[rate].cgst.plus(halfTax);
        taxSummary[rate].sgst = taxSummary[rate].sgst.plus(halfTax);
        taxSummary[rate].totalTax = taxSummary[rate].totalTax.plus(taxAmount);
      }
    }

    return { taxSummary, totalBills: bills.length };
  }

  // ── Stock movement audit log ──────────────────────────────────────────────────

  async getStockMovementLog(tenantId: string | null, query: { page?: number; limit?: number; itemId?: string; type?: string }) {
    const { page = 1, limit = 50, itemId, type } = query;
    const skip = (page - 1) * limit;

    const where: any = tenantId ? { tenantId } : {};
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { name: true, unit: true, barcode: true } },
          createdBy: { select: { name: true, role: true } },
        },
      }),
      this.prisma.stockTransaction.count({ where }),
    ]);

    return {
      transactions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
