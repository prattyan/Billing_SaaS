import { IsEnum, IsBoolean, IsOptional, IsDateString, IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier, SubscriptionStatus } from '@billing-saas/types';

export class CreateTenantByAdminDto {
  @ApiProperty({ example: 'Sunshine Supermarket' })
  @IsString()
  @MinLength(2)
  shopName: string;

  @ApiProperty({ example: 'Vikram Singh' })
  @IsString()
  @MinLength(2)
  ownerName: string;

  @ApiProperty({ example: 'vikram@sunshine.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'] })
  @IsOptional()
  @IsEnum(['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'])
  planTier?: PlanTier;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;
}

export class OverridePlanDto {
  @ApiProperty({ enum: ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'] })
  @IsEnum(['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'])
  planTier: PlanTier;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED'])
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  subscriptionExpiry?: string;
}

export class ToggleTenantStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
