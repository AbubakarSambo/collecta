import { IsArray, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignFeeDto {
  @ApiProperty({ example: ['member-id-1', 'member-id-2'] })
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];

  @ApiPropertyOptional({
    example: 4500,
    description: 'Override amount for specific members (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;
}
