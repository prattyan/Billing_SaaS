import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard summary — today and month sales, inventory alerts' })
  async getDashboard(@TenantId() tenantId: string) {
    return this.reportsService.getDashboardSummary(tenantId);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales report for a date range' })
  async getSales(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSalesReport(tenantId, from, to);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Top selling items' })
  async getBestSellers(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getBestSellingItems(tenantId, from, to, limit);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Items at or below reorder threshold' })
  async getLowStock(@TenantId() tenantId: string) {
    return this.reportsService.getLowStockItems(tenantId);
  }

  @Get('tax')
  @ApiOperation({ summary: 'Tax collected report (for GST filing)' })
  async getTaxReport(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getTaxReport(tenantId, from, to);
  }

  @Get('stock-movement')
  @ApiOperation({ summary: 'Stock transaction log' })
  async getStockMovement(
    @TenantId() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getStockMovementLog(tenantId, { itemId });
  }
}
