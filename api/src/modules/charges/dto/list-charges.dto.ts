import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ChargeStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto';

export class ListChargesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ChargeStatus)
  status?: ChargeStatus;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  feeId?: string;
}
