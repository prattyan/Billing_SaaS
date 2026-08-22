import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@billing-saas/types';

export class CreateStaffDto {
  @ApiProperty({ example: 'Suresh Raina' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'cashier1@demo-grocery.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '9876543212' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'StaffPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['BILLER', 'OWNER'], default: 'BILLER' })
  @IsEnum(['BILLER', 'OWNER'])
  role: Role;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Suresh Raina' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '9876543212' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPass@123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: ['BILLER', 'OWNER'] })
  @IsOptional()
  @IsEnum(['BILLER', 'OWNER'])
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
