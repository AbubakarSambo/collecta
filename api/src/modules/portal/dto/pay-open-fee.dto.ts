import { IsEmail, IsString, MinLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PayOpenFeeDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}
