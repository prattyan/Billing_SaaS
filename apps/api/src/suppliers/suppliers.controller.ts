import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, CreatePoDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';

@ApiTags('Suppliers & Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List all active suppliers' })
  async findAll(@TenantId() tenantId: string) {
    return this.suppliersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details with recent POs' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(tenantId, id);
  }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a supplier' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Put(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update supplier' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Deactivate supplier' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.remove(tenantId, id);
  }

  // ── Purchase Order Routes ──────────────────────────────────────────

  @Post('purchase-orders')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a purchase order' })
  async createPo(@TenantId() tenantId: string, @Body() dto: CreatePoDto) {
    return this.suppliersService.createPo(tenantId, dto);
  }

  @Get('purchase-orders/list')
  @ApiOperation({ summary: 'List purchase orders' })
  async listPos(@TenantId() tenantId: string) {
    return this.suppliersService.listPos(tenantId);
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get purchase order details' })
  async getPo(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.getPo(tenantId, id);
  }

  @Post('purchase-orders/:id/receive')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Receive against PO and auto-update stock' })
  async receivePo(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.suppliersService.receivePo(tenantId, id, user.sub);
  }
}
