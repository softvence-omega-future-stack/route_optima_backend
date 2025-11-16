import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '@prisma/client';

export class GetJobsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  serviceAddress?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  search?: string; // General search across multiple fields

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsEnum(JobStatus, { message: 'Status must be either ASSIGNED or COMPLETED' })
  status?: JobStatus;
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
