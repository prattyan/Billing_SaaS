import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockAdjustmentDto } from './dto/stock.dto';
import Decimal from 'decimal.js';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async adjustStock(tenantId: string, userId: string, dto: StockAdjustmentDto) {
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, tenantId, isActive: true },
    });

    if (!item) throw new NotFoundException('Item not found');

    const current = new Decimal(item.currentStock.toString());
    const delta = new Decimal(dto.quantityDelta);
    const newStock = current.plus(delta);

    if (newStock.isNegative()) {
      throw new BadRequestException(`Cannot adjust stock below 0. Current stock is ${current.toString()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.item.update({
        where: { id: dto.itemId },
        data: { currentStock: newStock as any },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          tenantId,
          itemId: dto.itemId,
          type: 'ADJUSTMENT',
          quantity: delta,
          costPrice: item.costPrice,
          reason: `[${dto.reasonType}] ${dto.notes ?? ''}`.trim(),
          createdById: userId,
        },
      });

      return {
        item: updatedItem,
        transaction,
      };
    });
  }

  async getTransactions(tenantId: string, itemId?: string, limit = 50) {
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;

    return this.prisma.stockTransaction.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, barcode: true, unit: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
