import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateDispatcherDto {
  @IsOptional()
  @IsString()
  name?: string;

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