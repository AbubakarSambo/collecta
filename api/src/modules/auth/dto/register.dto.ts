import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NetworkType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Amaka' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'amaka@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Greenpark Estate' })
  @IsString()
  @MaxLength(100)
  networkName: string;

  @ApiProperty({ example: 'greenpark' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  networkSlug: string;

  @ApiPropertyOptional({ example: 'Greenpark Estate Residents Association' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  networkDescription?: string;

  @ApiPropertyOptional({ enum: NetworkType, example: NetworkType.ESTATE })
  @IsOptional()
  @IsEnum(NetworkType)
  networkType?: NetworkType;
}
