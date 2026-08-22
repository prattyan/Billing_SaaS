import { IsString, IsOptional, IsEmail, MaxLength, IsArray, ValidateNested, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty({ example: 'ABC Distributors' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: '9988776655' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: 'abc@distributors.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Wholesale Market, Bangalore' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {}

export class PoItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 120.50 })
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreatePoDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiProperty({ type: [PoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items: PoItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
