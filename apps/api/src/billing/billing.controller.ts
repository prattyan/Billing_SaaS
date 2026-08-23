import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateBillDto, HoldBillDto, ReturnBillDto, BillQueryDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';

@ApiTags('Billing / POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Public customer invoice download and view' })
  async findPublicBill(@Param('id') id: string) {
    return this.billingService.findPublicBill(id);
  }

  @Post()
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Finalize a sale and create a bill' })
  async createBill(
    @Body() dto: CreateBillDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.billingService.createBill(tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bills (paginated)' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: BillQueryDto,
  ) {
    return this.billingService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill details' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.billingService.findOne(tenantId, id);
  }

  @Post('hold')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Park (hold) the current cart' })
  async holdBill(
    @Body() dto: HoldBillDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.billingService.holdBill(tenantId, user.sub, dto);
  }

  @Get('held/list')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Get held (parked) bills for the current biller' })
  async getHeldBills(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.billingService.getHeldBills(tenantId, user.sub);
  }

  @Post('held/:holdId/resume')
  @Roles('OWNER', 'BILLER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a held bill' })
  async resumeHeldBill(@Param('holdId') holdId: string, @TenantId() tenantId: string) {
    return this.billingService.resumeHeldBill(tenantId, holdId);
  }

  @Post('return')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Process a bill return / refund' })
  async returnBill(
    @Body() dto: ReturnBillDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.billingService.returnBill(tenantId, user.sub, dto);
  }
}
