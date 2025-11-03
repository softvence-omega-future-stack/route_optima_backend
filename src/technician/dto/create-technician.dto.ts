import { IsString, IsOptional, IsBoolean, IsPhoneNumber, IsDateString } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsPhoneNumber('US')
  phone?: string;

  @IsOptional()
  @IsString()
  region?: string;

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
  isActive?: boolean = true;
}
