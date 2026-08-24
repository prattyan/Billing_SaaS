import { Controller, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateShopSettingsDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Shop Settings & Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current shop profile with stats' })
  async getProfile(@TenantId() tenantId: string) {
    return this.tenantsService.getProfile(tenantId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get shop billing settings and preferences' })
  async getSettings(@TenantId() tenantId: string) {
    return this.tenantsService.getSettings(tenantId);
  }

  @Put('settings')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update shop billing settings' })
  async updateSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateShopSettingsDto,
  ) {
    return this.tenantsService.updateSettings(tenantId, dto);
  }

  @Delete('my-shop')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Request shop deletion with 10-day recovery window' })
  async deleteMyShop(@TenantId() tenantId: string) {
    return this.tenantsService.deleteMyShop(tenantId);
  }
}

