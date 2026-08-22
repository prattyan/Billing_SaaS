import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'List all customers' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(tenantId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
    });
  }

  @Get('phone/:phone')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Lookup customer by phone number (used by POS)' })
  async findByPhone(@Param('phone') phone: string, @TenantId() tenantId: string) {
    return this.customersService.findByPhone(tenantId, phone);
  }

  @Get(':id')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Get customer detail with purchase history' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.customersService.findOne(tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenantId, dto);
  }

  @Put(':id')
  @Roles('OWNER', 'BILLER')
  @ApiOperation({ summary: 'Update customer details' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete a customer' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customersService.remove(tenantId, id);
  }
}
