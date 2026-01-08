import { IsString, IsEmail, IsOptional, IsDate, IsNumber, IsEnum } from 'class-validator';
import { JobType } from '@prisma/client';
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
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  jobSource?: string;

  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

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