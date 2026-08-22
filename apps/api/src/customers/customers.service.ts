import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { totalSpend: 'desc' },
        include: { _count: { select: { bills: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { customers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { _count: { select: { items: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(tenantId: string, phone: string) {
    const cleanPhone = phone.trim();
    return this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: cleanPhone } },
    });
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const phone = dto.phone.trim();
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
    if (existing) {
      throw new ConflictException(`Customer with phone number ${phone} already exists`);
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        phone,
        name: dto.name?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.phone && dto.phone.trim() !== customer.phone) {
      const phone = dto.phone.trim();
      const existing = await this.prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Customer with phone number ${phone} already exists`);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }
}
