import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Subscriptions & Cashfree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current subscription details, live SKU usage meter, and invoice history' })
  async getCurrent(@TenantId() tenantId: string) {
    return this.subscriptionsService.getCurrent(tenantId);
  }

  @Post('create-order')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Initiate Cashfree payment order for plan upgrade' })
  async createOrder(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.subscriptionsService.createOrder(tenantId, user.sub, dto);
  }

  @Post('verify')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Verify Cashfree payment and activate upgraded plan' })
  async verifyAndUpgrade(
    @TenantId() tenantId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.subscriptionsService.verifyAndUpgrade(tenantId, dto);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Cashfree payment gateway webhook listener' })
  async webhook(@Body() payload: any) {
    // Webhook receiver
    return { status: 'OK' };
  }
}
