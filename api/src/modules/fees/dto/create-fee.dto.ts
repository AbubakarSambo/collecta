import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeType, FeeFrequency } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateFeeDto {
  @ApiProperty({ example: 'Monthly Estate Dues' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  type: FeeType;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ enum: FeeFrequency, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(FeeFrequency)
  frequency?: FeeFrequency;

  @ApiPropertyOptional({ example: 1, description: 'Day of month charges are due (1-28)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  @Type(() => Number)
  dueDay?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  penaltyEnabled?: boolean;

  @ApiPropertyOptional({ example: 10, description: 'Penalty as percentage of fee amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  penaltyPercent?: number;

  @ApiPropertyOptional({ example: 7, description: 'Days after due date before penalty is applied' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  penaltyGraceDays?: number;

  @ApiPropertyOptional({
    description: 'For OPEN fees: JSON array of options [{name, amount}]',
    example: [{ name: 'Guest Parking', amount: 2000 }, { name: 'Pool Access', amount: 1500 }],
  })
  @IsOptional()
  options?: any;
}
