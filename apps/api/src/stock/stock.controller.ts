import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockAdjustmentDto } from './dto/stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';

@ApiTags('Stock & Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('adjust')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Perform stock adjustment (damage, loss, manual correction)' })
  async adjustStock(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.stockService.adjustStock(tenantId, user.sub, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get stock audit transaction logs' })
  async getTransactions(
    @TenantId() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.stockService.getTransactions(tenantId, itemId, limit ? Number(limit) : 50);
  }
}
