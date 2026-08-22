import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, CreatePoDto } from './dto/supplier.dto';
import Decimal from 'decimal.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: {
          select: { items: true, purchaseOrders: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        items: { select: { id: true, name: true, barcode: true, currentStock: true, costPrice: true } },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(tenantId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Purchase Orders ───────────────────────────────────────────

  async createPo(tenantId: string, dto: CreatePoDto) {
    const supplier = await this.findOne(tenantId, dto.supplierId);

    let totalAmount = new Decimal(0);
    for (const item of dto.items) {
      totalAmount = totalAmount.plus(new Decimal(item.quantity).mul(new Decimal(item.unitPrice)));
    }

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supplier.id,
        status: 'DRAFT',
        totalAmount,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            itemId: i.itemId,
            quantity: new Decimal(i.quantity),
            unitPrice: new Decimal(i.unitPrice),
          })),
        },
      },
      include: {
        items: { include: { item: { select: { name: true, unit: true } } } },
        supplier: true,
      },
    });
  }

  async listPos(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: {
        supplier: { select: { id: true, name: true, contact: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPo(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async receivePo(tenantId: string, poId: string, userId: string) {
    const po = await this.getPo(tenantId, poId);

    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Purchase order is already received');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update item stocks and create stock transactions
      for (const poItem of po.items) {
        await tx.item.update({
          where: { id: poItem.itemId },
          data: {
            currentStock: { increment: poItem.quantity as any },
            costPrice: poItem.unitPrice,
          },
        });

        await tx.stockTransaction.create({
          data: {
            tenantId,
            itemId: poItem.itemId,
            type: 'RESTOCK',
            quantity: poItem.quantity,
            costPrice: poItem.unitPrice,
            referenceId: po.id,
            reason: `Received against PO #${po.id.slice(-6).toUpperCase()}`,
            createdById: userId,
          },
        });

        await tx.poItem.update({
          where: { id: poItem.id },
          data: { receivedQty: poItem.quantity },
        });
      }

      return tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: { items: true, supplier: true },
      });
    });
  }
}
