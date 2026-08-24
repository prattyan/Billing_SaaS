import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './superadmin.service';
import { CreateTenantByAdminDto, OverridePlanDto, ToggleTenantStatusDto } from './dto/superadmin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Super Admin (Platform Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get global platform metrics, active tenants, revenue & plan stats' })
  async getMetrics() {
    return this.superAdminService.getMetrics();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenant shops with owners, plan tiers, and stats' })
  async getAllTenants(
    @Query('search') search?: string,
    @Query('planTier') planTier?: string,
  ) {
    return this.superAdminService.getAllTenants({ search, planTier });
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create and onboard a new shop with an owner' })
  async createTenant(@Body() dto: CreateTenantByAdminDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Put('tenants/:id/plan')
  @ApiOperation({ summary: 'Override plan tier or subscription status for a shop' })
  async overridePlan(
    @Param('id') id: string,
    @Body() dto: OverridePlanDto,
  ) {
    return this.superAdminService.overridePlan(id, dto);
  }

  @Put('tenants/:id/status')
  @ApiOperation({ summary: 'Suspend or activate a shop' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() dto: ToggleTenantStatusDto,
  ) {
    return this.superAdminService.toggleStatus(id, dto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Permanently delete a shop and all associated data' })
  async deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  @Post('tenants/:id/restore')
  @ApiOperation({ summary: 'Recover and restore a soft-deleted shop within the 10-day window' })
  async restoreTenant(@Param('id') id: string) {
    return this.superAdminService.restoreTenant(id);
  }

  // ── Subscription Approval ──────────────────────

  @Get('subscriptions/pending')
  @ApiOperation({ summary: 'List all pending subscription upgrade requests awaiting approval' })
  async getPendingApprovals() {
    return this.superAdminService.getPendingApprovals();
  }

  @Post('subscriptions/:id/approve')
  @ApiOperation({ summary: 'Approve a pending subscription upgrade — activates the new plan tier' })
  async approveUpgrade(@Param('id') id: string) {
    return this.superAdminService.approveUpgrade(id);
  }

  @Post('subscriptions/:id/reject')
  @ApiOperation({ summary: 'Reject a pending subscription upgrade request' })
  async rejectUpgrade(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.superAdminService.rejectUpgrade(id, reason);
  }
}
