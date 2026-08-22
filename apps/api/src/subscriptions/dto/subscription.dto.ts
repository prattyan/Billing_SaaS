import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier } from '../../types';

export class CreateOrderDto {
  @ApiProperty({ enum: ['GROWTH', 'BUSINESS', 'ENTERPRISE'] })
  @IsEnum(['GROWTH', 'BUSINESS', 'ENTERPRISE'])
  planTier: Exclude<PlanTier, 'STARTER'>;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentId?: string;
}
