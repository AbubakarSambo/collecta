import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportMembersDto {
  @ApiProperty({
    description: 'CSV string with columns: firstName,lastName,email,phone,unit,memberCode',
    example: 'firstName,lastName,email,phone,unit,memberCode\nChidi,Eze,chidi@example.com,+2348012345678,Unit 1A,MBR-001',
  })
  @IsString()
  csvData: string;
}
