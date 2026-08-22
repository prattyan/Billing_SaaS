import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Shop Staff / Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('staff')
  @Roles('OWNER')
  @ApiOperation({ summary: 'List all staff members for the current shop' })
  async getStaff(@TenantId() tenantId: string) {
    return this.usersService.getStaff(tenantId);
  }

  @Post('staff')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Add a new cashier/biller to the shop' })
  async createStaff(@TenantId() tenantId: string, @Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(tenantId, dto);
  }

  @Put('staff/:id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update staff member credentials/role' })
  async updateStaff(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.usersService.updateStaff(tenantId, id, dto);
  }

  @Delete('staff/:id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Deactivate a staff member' })
  async removeStaff(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.removeStaff(tenantId, id);
  }
}
