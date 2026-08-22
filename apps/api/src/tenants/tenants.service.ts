import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopSettingsDto } from './dto/tenant.dto';
import Decimal from 'decimal.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        shopSettings: true,
        _count: {
          select: { items: true, users: true, customers: true, bills: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Shop not found');
    return tenant;
  }

  async getSettings(tenantId: string) {
    let settings = await this.prisma.shopSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await this.prisma.shopSettings.create({
        data: {
          tenantId,
          billPrefix: 'INV',
          requireCustomerPhone: false,
          whatsappEnabled: true,
        },
      });
    }

    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateShopSettingsDto) {
    const data: any = { ...dto };
    if (dto.loyaltyEarnRate !== undefined) data.loyaltyEarnRate = new Decimal(dto.loyaltyEarnRate);
    if (dto.loyaltyRedeemRate !== undefined) data.loyaltyRedeemRate = new Decimal(dto.loyaltyRedeemRate);

    return this.prisma.shopSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }
}
