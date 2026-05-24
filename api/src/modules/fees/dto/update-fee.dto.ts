import { PartialType } from '@nestjs/swagger';
import { CreateFeeDto } from './create-fee.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeeDto extends PartialType(CreateFeeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
