import { IsString, IsOptional, IsEmail, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'Chidi' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Eze' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ example: 'chidi@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Unit 12B' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ example: 'MBR-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberCode?: string;

  @ApiPropertyOptional({ example: '12 Mango Street, Lagos. Emergency contact: 08012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Only set this to true if the member has actually consented to receive WhatsApp reminders.',
  })
  @IsOptional()
  @IsBoolean()
  whatsappOptedIn?: boolean;
}
