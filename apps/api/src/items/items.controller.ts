import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, RestockItemDto, ItemQueryDto } from './dto/item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';

@ApiTags('Inventory / Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /** Barcode lookup — used by POS scanner (must be < 300ms) */
  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Lookup item by barcode (POS scan)' })
  async lookupByBarcode(
    @Param('barcode') barcode: string,
    @TenantId() tenantId: string,
  ) {
    return this.itemsService.lookupByBarcode(tenantId, barcode);
  }

  /** Plan usage stats */
  @Get('plan-usage')
  @Roles('OWNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get current SKU count vs plan limit' })
  async getPlanUsage(@TenantId() tenantId: string) {
    return this.itemsService.getPlanUsage(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all items with filters and pagination' })
  async findAll(@TenantId() tenantId: string, @Query() query: ItemQueryDto) {
    return this.itemsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item detail with stock history' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a new inventory item' })
  async create(
    @Body() dto: CreateItemDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.itemsService.create(tenantId, dto, user.sub);
  }

  @Put(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update an item' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @TenantId() tenantId: string,
  ) {
    return this.itemsService.update(tenantId, id, dto);
  }

  @Post(':id/restock')
  @Roles('OWNER', 'BILLER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restock an item (add quantity)' })
  async restock(
    @Param('id') id: string,
    @Body() dto: RestockItemDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.itemsService.restock(tenantId, id, dto, user.sub);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Soft-delete an item (deactivate)' })
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.itemsService.remove(tenantId, id);
  }
}
