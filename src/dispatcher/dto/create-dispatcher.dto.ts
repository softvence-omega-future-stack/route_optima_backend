import { IsString, IsOptional, IsBoolean, IsPhoneNumber, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateDispatcherDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}