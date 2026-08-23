import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBillDto, HoldBillDto, ReturnBillDto } from './dto/billing.dto';
import { TaxCalculator } from './tax.calculator';
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  // ── Create Bill (finalize sale) ──────────────────────────────────────────────

  async createBill(tenantId: string, billerId: string, dto: CreateBillDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Bill must have at least one item');
    }

    // Check customer phone requirement
    const settings = await this.prisma.shopSettings.findUnique({
      where: { tenantId },
    });
    if (settings?.requireCustomerPhone && !dto.customerPhone) {
      throw new BadRequestException('Customer phone number is required');
    }

    // Fetch all items in one query
    const itemIds = dto.items.map((i) => i.itemId);
    const dbItems = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, tenantId, isActive: true },
    });

    if (dbItems.length !== dto.items.length) {
      const missing = itemIds.filter((id) => !dbItems.find((i) => i.id === id));
      throw new NotFoundException(`Items not found: ${missing.join(', ')}`);
    }

    // Validate stock availability
    for (const lineItem of dto.items) {
      const dbItem = dbItems.find((i) => i.id === lineItem.itemId)!;
      const available = new Decimal(dbItem.currentStock.toString());
      const requested = new Decimal(lineItem.qty);
      if (available.lt(requested)) {
        throw new BadRequestException(
          `Insufficient stock for "${dbItem.name}": available ${available}, requested ${requested}`,
        );
      }
    }

    // Calculate bill
    const lineCalcs = dto.items.map((lineItem) => {
      const dbItem = dbItems.find((i) => i.id === lineItem.itemId)!;
      const priceAtSale = lineItem.priceOverride != null
        ? new Decimal(lineItem.priceOverride)
        : new Decimal((dbItem.offerPrice ?? dbItem.mrp).toString());
      const taxPercent = new Decimal(dbItem.taxPercent.toString());
      const { taxableAmount, taxAmount, lineTotal } = TaxCalculator.calculateLineItem(
        lineItem.qty,
        priceAtSale.toNumber(),
        taxPercent.toNumber(),
      );
      return {
        itemId: lineItem.itemId,
        itemNameAtSale: dbItem.name,
        barcodeAtSale: dbItem.barcode,
        qty: new Decimal(lineItem.qty),
        mrpAtSale: new Decimal(dbItem.mrp.toString()),
        priceAtSale,
        taxPercentAtSale: taxPercent,
        taxAmount,
        lineTotal,
      };
    });

    // Calculate bill discounts: manual discount + loyalty points redeemed (1 pt = ₹1)
    const manualDiscount = new Decimal(dto.discount ?? 0);
    const pointsToRedeem = new Decimal(dto.pointsToRedeem ?? 0);
    const combinedDiscount = manualDiscount.plus(pointsToRedeem);

    const { subtotal, taxTotal, discount, grandTotal } = TaxCalculator.calculateBill(
      lineCalcs.map((l) => ({
        qty: l.qty.toNumber(),
        priceAtSale: l.priceAtSale.toNumber(),
        taxPercent: l.taxPercentAtSale.toNumber(),
      })),
      combinedDiscount.toNumber(),
    );

    // Execute as a transaction
    const bill = await this.prisma.$transaction(async (tx) => {
      // Get/create customer
      let customer: any = null;
      const cleanPhone = dto.customerPhone?.trim();
      const trimmedName = dto.customerName?.trim();
      if (cleanPhone) {
        customer = await tx.customer.upsert({
          where: { tenantId_phone: { tenantId, phone: cleanPhone } },
          create: {
            tenantId,
            phone: cleanPhone,
            name: trimmedName || 'Walk-in Customer',
          },
          update: (trimmedName && trimmedName !== 'Walk-in Customer')
            ? { name: trimmedName }
            : {},
        });
      } else if (trimmedName && trimmedName !== 'Walk-in Customer') {
        const placeholderPhone = `GUEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        customer = await tx.customer.create({
          data: {
            tenantId,
            phone: placeholderPhone,
            name: trimmedName,
          },
        });
      }

      // Check loyalty points balance if redeeming
      if (pointsToRedeem.gt(0)) {
        if (!customer) {
          throw new BadRequestException('Customer phone is required to redeem loyalty points');
        }
        const availablePoints = new Decimal(customer.loyaltyPoints?.toString() ?? '0');
        if (availablePoints.lt(pointsToRedeem)) {
          throw new BadRequestException(
            `Insufficient loyalty points: customer has ${availablePoints.toFixed(0)} pts, tried to redeem ${pointsToRedeem.toFixed(0)} pts`,
          );
        }
      }

      // Generate sequential bill number
      const shopSettings = await tx.shopSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          billPrefix: 'INV',
          billCounter: 1,
        },
        update: {
          billCounter: { increment: 1 },
        },
      });
      const prefix = shopSettings.billPrefix || 'INV';
      const billNumber = `${prefix}-${String(shopSettings.billCounter).padStart(5, '0')}`;

      // Create bill
      const newBill = await tx.bill.create({
        data: {
          tenantId,
          billNumber,
          customerId: customer?.id,
          billerId,
          subtotal,
          discount,
          taxTotal,
          grandTotal,
          paymentMode: dto.paymentMode,
          paymentDetails: dto.paymentDetails ? JSON.stringify(dto.paymentDetails) : undefined,
          status: 'PAID',
          notes: dto.notes,
          items: {
            create: lineCalcs.map((l) => ({
              itemId: l.itemId,
              itemNameAtSale: l.itemNameAtSale,
              barcodeAtSale: l.barcodeAtSale,
              qty: l.qty,
              mrpAtSale: l.mrpAtSale,
              priceAtSale: l.priceAtSale,
              taxPercentAtSale: l.taxPercentAtSale,
              taxAmount: l.taxAmount,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: {
          items: { include: { item: { select: { name: true, barcode: true, unit: true } } } },
          customer: true,
          tenant: { include: { shopSettings: true } },
          biller: { select: { id: true, name: true } },
        },
      });

      // Deduct stock and create stock transactions
      await Promise.all(
        lineCalcs.map((l) =>
          Promise.all([
            tx.item.update({
              where: { id: l.itemId },
              data: { currentStock: { decrement: l.qty as any } },
            }),
            tx.stockTransaction.create({
              data: {
                tenantId,
                itemId: l.itemId,
                type: 'SALE',
                quantity: l.qty.negated(),
                referenceId: newBill.id,
                createdById: billerId,
              },
            }),
          ]),
        ),
      );

      // Update customer spend + loyalty:
      // 1 loyalty point for every ₹100 spend
      if (customer?.id) {
        const pointsEarned = new Decimal(Math.floor(grandTotal.toNumber() / 100));
        const netPointsDiff = pointsEarned.minus(pointsToRedeem);

        const updatedCustomer = await tx.customer.update({
          where: { id: (customer as any).id },
          data: {
            totalSpend: { increment: grandTotal as any },
            loyaltyPoints: { increment: netPointsDiff as any },
          },
        });

        (newBill as any).pointsEarned = pointsEarned.toNumber();
        (newBill as any).pointsRedeemed = pointsToRedeem.toNumber();
        (newBill as any).customer = updatedCustomer;
      }

      return newBill;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    this.logger.log(`Bill created: ${bill.billNumber} | Total: ₹${grandTotal} | Tenant: ${tenantId}`);

    // Trigger WhatsApp digital invoice delivery in background
    if (dto.customerPhone) {
      const appBaseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3000';
      this.notificationsService.sendBillDelivery({
        tenantId,
        billId: bill.id,
        customerPhone: dto.customerPhone,
        customerName: dto.customerName,
        billNumber: bill.billNumber,
        grandTotal: grandTotal.toFixed(2),
        shopName: bill.tenant?.name ?? 'Our Store',
        pdfUrl: `${appBaseUrl}/bill/${bill.id}`,
      }).catch((err) => {
        this.logger.warn(`Background WhatsApp delivery notice: ${err.message}`);
      });
    }

    return bill;
  }

  // ── List bills ────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;
    const cleanSearch = query?.search?.trim();

    const tenantFilter = tenantId ? { tenantId } : {};
    const where: any = { ...tenantFilter, status: { not: 'HELD' } };

    if (cleanSearch) {
      where.OR = [
        { billNumber: { contains: cleanSearch, mode: 'insensitive' } },
        { customer: { is: { phone: { contains: cleanSearch } } } },
        { customer: { is: { name: { contains: cleanSearch, mode: 'insensitive' } } } },
      ];
    }

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          biller: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.bill.count({ where }),
    ]);

    return { bills, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── Get one bill ──────────────────────────────────────────────────────────────

  async findOne(tenantId: string, id: string) {
    const tenantFilter = tenantId ? { tenantId } : {};
    const bill = await this.prisma.bill.findFirst({
      where: { id, ...tenantFilter },
      include: {
        items: { include: { item: { select: { name: true, barcode: true, unit: true } } } },
        customer: true,
        tenant: { include: { shopSettings: true } },
        biller: { select: { id: true, name: true } },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async findPublicBill(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        items: { include: { item: { select: { name: true, barcode: true, unit: true } } } },
        customer: true,
        tenant: { include: { shopSettings: true } },
        biller: { select: { id: true, name: true } },
      },
    });
    if (!bill) throw new NotFoundException('Invoice not found');
    return bill;
  }

  // ── Hold bill (park cart) ─────────────────────────────────────────────────────

  async holdBill(tenantId: string, billerId: string, dto: HoldBillDto) {
    const held = await this.prisma.heldBill.create({
      data: {
        tenantId,
        billerId,
        label: dto.label,
        cartData: JSON.stringify(dto),
      },
    });
    return held;
  }

  async getHeldBills(tenantId: string, _billerId?: string) {
    return this.prisma.heldBill.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resumeHeldBill(tenantId: string, holdId: string) {
    const held = await this.prisma.heldBill.findFirst({
      where: { id: holdId, tenantId },
    });
    if (!held) throw new NotFoundException('Held bill not found');
    await this.prisma.heldBill.delete({ where: { id: holdId } });
    return JSON.parse(held.cartData);
  }

  // ── Return/Refund ─────────────────────────────────────────────────────────────

  async returnBill(tenantId: string, billerId: string, dto: ReturnBillDto) {
    const originalBill = await this.prisma.bill.findFirst({
      where: { id: dto.originalBillId, tenantId },
      include: { items: true },
    });
    if (!originalBill) throw new NotFoundException('Original bill not found');

    if (originalBill.status === 'RETURNED') {
      throw new BadRequestException('This bill has already been returned');
    }

    const returnLineCalcs = dto.items.map((lineItem) => {
      const originalLine = originalBill.items.find((i) => i.itemId === lineItem.itemId);
      if (!originalLine) throw new BadRequestException(`Item ${lineItem.itemId} not in original bill`);
      if (new Decimal(lineItem.qty).gt(new Decimal(originalLine.qty.toString()))) {
        throw new BadRequestException('Return quantity exceeds original quantity');
      }
      const { taxableAmount, taxAmount, lineTotal } = TaxCalculator.calculateLineItem(
        lineItem.qty,
        new Decimal(originalLine.priceAtSale.toString()).toNumber(),
        new Decimal(originalLine.taxPercentAtSale.toString()).toNumber(),
      );
      return { ...lineItem, originalLine, taxableAmount, taxAmount, lineTotal };
    });

    const returnTotals = TaxCalculator.calculateBill(
      returnLineCalcs.map((l) => ({
        qty: l.qty,
        priceAtSale: new Decimal(l.originalLine.priceAtSale.toString()).toNumber(),
        taxPercent: new Decimal(l.originalLine.taxPercentAtSale.toString()).toNumber(),
      })),
    );

    const returnBill = await this.prisma.$transaction(async (tx) => {
      // Create return bill
      const shopSettings = await tx.shopSettings.update({
        where: { tenantId },
        data: { billCounter: { increment: 1 } },
      });
      const billNumber = `${shopSettings.billPrefix}-${String(shopSettings.billCounter).padStart(5, '0')}-RTN`;

      const newReturn = await tx.bill.create({
        data: {
          tenantId,
          billNumber,
          customerId: originalBill.customerId,
          billerId,
          subtotal: returnTotals.subtotal.negated(),
          discount: new Decimal(0),
          taxTotal: returnTotals.taxTotal.negated(),
          grandTotal: returnTotals.grandTotal.negated(),
          paymentMode: originalBill.paymentMode,
          status: 'RETURNED',
          returnedBillId: originalBill.id,
          notes: dto.reason,
          items: {
            create: returnLineCalcs.map((l) => ({
              itemId: l.itemId,
              itemNameAtSale: l.originalLine.itemNameAtSale,
              barcodeAtSale: l.originalLine.barcodeAtSale,
              qty: new Decimal(l.qty).negated(),
              mrpAtSale: l.originalLine.mrpAtSale,
              priceAtSale: l.originalLine.priceAtSale,
              taxPercentAtSale: l.originalLine.taxPercentAtSale,
              taxAmount: l.taxAmount.negated(),
              lineTotal: l.lineTotal.negated(),
            })),
          },
        },
      });

      // Mark original as returned
      await tx.bill.update({
        where: { id: dto.originalBillId },
        data: { status: 'RETURNED' },
      });

      // Re-add stock
      await Promise.all(
        returnLineCalcs.map((l) =>
          Promise.all([
            tx.item.update({
              where: { id: l.itemId },
              data: { currentStock: { increment: new Decimal(l.qty) as any } },
            }),
            tx.stockTransaction.create({
              data: {
                tenantId,
                itemId: l.itemId,
                type: 'RETURN',
                quantity: new Decimal(l.qty),
                referenceId: newReturn.id,
                createdById: billerId,
              },
            }),
          ]),
        ),
      );

      return newReturn;
    });

    return returnBill;
  }
}
