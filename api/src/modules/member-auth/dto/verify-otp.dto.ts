import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Length(1, 100)
  slug: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
