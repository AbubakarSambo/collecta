import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto';
import { Transform } from 'class-transformer';

export class ListMembersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ description: 'Filter for ghost members — active, assigned fees, never paid, joined 90+ days ago' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ghost?: boolean;
}
