import { IsString, IsOptional, IsBoolean, IsPhoneNumber, IsDateString } from 'class-validator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  workStartTime?: string;

  @IsOptional()
  @IsDateString()
  workEndTime?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}