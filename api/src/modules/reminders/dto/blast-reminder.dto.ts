import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderChannel } from '@prisma/client';

export class BlastReminderDto {
  @ApiProperty({ enum: ReminderChannel, isArray: true, example: ['EMAIL'] })
  @IsArray()
  @IsEnum(ReminderChannel, { each: true })
  channels: ReminderChannel[];

  @ApiPropertyOptional({ example: 'Please pay your dues to avoid penalties.' })
  @IsOptional()
  @IsString()
  message?: string;
}
