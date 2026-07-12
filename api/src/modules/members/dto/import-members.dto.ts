import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportMembersDto {
  @ApiProperty({
    description:
      'CSV string with columns: firstName,lastName,email,phone,unit,memberCode,whatsappOptIn. ' +
      'whatsappOptIn is optional and accepts yes/y/true/1 (case-insensitive) — only set it if the member actually consented to WhatsApp reminders.',
    example: 'firstName,lastName,email,phone,unit,memberCode,whatsappOptIn\nChidi,Eze,chidi@example.com,+2348012345678,Unit 1A,MBR-001,yes',
  })
  @IsString()
  csvData: string;
}
