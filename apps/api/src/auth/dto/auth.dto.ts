import { IsEmail, IsString, MinLength, IsPhoneNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Demo Grocery Store' })
  @IsString()
  @MaxLength(100)
  shopName: string;

  @ApiProperty({ example: 'Ramesh Kumar' })
  @IsString()
  @MaxLength(100)
  ownerName: string;

  @ApiProperty({ example: 'owner@demogrocery.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'owner@demogrocery.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
