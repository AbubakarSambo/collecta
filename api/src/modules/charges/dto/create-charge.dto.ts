import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateChargeDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feeId?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2024-12-01' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
