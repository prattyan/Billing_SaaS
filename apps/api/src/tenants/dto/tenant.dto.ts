import { IsString, IsBoolean, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShopSettingsDto {
  @ApiPropertyOptional({ example: '29AABCU9603R1ZX' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ example: '123 Main St, Bangalore' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'INV' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  billPrefix?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requireCustomerPhone?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyEarnRate?: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyRedeemRate?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  thermalPrinterWidth?: number;

  @ApiPropertyOptional({ example: 'merchant@upi' })
  @IsOptional()
  @IsString()
  upiId?: string;
}
