import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;

  @IsString()
  serviceAddress: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  timeSlotId: string;

  @IsString()
  technicianId: string;
}