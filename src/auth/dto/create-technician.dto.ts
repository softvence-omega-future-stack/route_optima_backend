import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  workHours?: string;
}