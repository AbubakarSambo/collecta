import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitVerificationDto {
  @ApiProperty({ example: 'Greenpark Estate Residents Association' })
  @IsString()
  @MaxLength(200)
  organisationName: string;

  @ApiPropertyOptional({ example: 'RC1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cacNumber?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bvn?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nin?: string;

  @ApiProperty({ example: '12 Main Street, Lagos' })
  @IsString()
  @MaxLength(300)
  contactAddress: string;

  @ApiPropertyOptional({ example: 'A residential estate community in Lagos managing dues and levies' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  networkContext?: string;
}
