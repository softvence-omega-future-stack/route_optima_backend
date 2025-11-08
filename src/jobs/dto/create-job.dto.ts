import { IsString, IsEmail, IsOptional, IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  // Customer Information
  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsString()
  serviceAddress: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
  
  // Job Details
  @IsString()
  jobDescription: string;
  
  // Schedule Information
  @IsDate()
  @Type(() => Date)
  scheduledDate: Date;

  @IsString()
  timeSlotId: string;

  @IsString()
  technicianId: string;
  
  // Optional geolocation
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}