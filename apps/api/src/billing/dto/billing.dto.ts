import {
  IsString, IsOptional, IsNumber, IsPositive, IsArray,
  ValidateNested, IsEnum, Min, IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMode } from '@billing-saas/types';

export class BillItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 2 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  qty: number;

  @ApiPropertyOptional({ description: 'Manual price override (requires OWNER role)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number;
}

export class CreateBillDto {
  @ApiProperty({ type: [BillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ enum: ['CASH', 'CARD', 'UPI', 'WALLET', 'SPLIT'] })
  @IsEnum(['CASH', 'CARD', 'UPI', 'WALLET', 'SPLIT'])
  paymentMode: PaymentMode;

  @ApiPropertyOptional({ description: 'For SPLIT payments: {cash: 100, upi: 50}' })
  @IsOptional()
  paymentDetails?: Record<string, number>;

  @ApiPropertyOptional({ example: 10, description: 'Bill-level discount in ₹' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 5, description: 'Loyalty points to redeem (1 pt = ₹1)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pointsToRedeem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class HoldBillDto {
  @ApiProperty({ type: [BillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}

export class ReturnBillDto {
  @ApiProperty({ description: 'Original bill ID to return against' })
  @IsString()
  originalBillId: string;

  @ApiProperty({ type: [BillItemDto], description: 'Items and quantities being returned' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
