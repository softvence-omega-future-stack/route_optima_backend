import { IsString, IsOptional, IsBoolean, IsPhoneNumber, IsDateString, Matches } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  name: string;

  @IsPhoneNumber()
  phone: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'workStartTime must be in HH:mm format (e.g., 08:00)',
  })
  workStartTime?: string;

  
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'workEndTime must be in HH:mm format (e.g., 18:00)',
  })
  workEndTime?: string; 

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
