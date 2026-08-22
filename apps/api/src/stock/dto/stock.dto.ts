import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockAdjustmentType {
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  AUDIT_CORRECTION = 'AUDIT_CORRECTION',
  RETURN = 'RETURN',
}

export class StockAdjustmentDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: -5, description: 'Quantity change (negative for reduction, positive for addition)' })
  @IsNumber()
  quantityDelta: number;

  @ApiProperty({ enum: StockAdjustmentType })
  @IsEnum(StockAdjustmentType)
  reasonType: StockAdjustmentType;

  @ApiPropertyOptional({ example: 'Damaged packaging during transit' })
  @IsOptional()
  @IsString()
  notes?: string;
}
