import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNotEmpty, Matches, IsOptional, IsInt, Min } from 'class-validator';
import { CreateDefaultTimeSlotDto } from './create-default-time-slot.dto';

export class UpdateDefaultTimeSlotDto extends PartialType(CreateDefaultTimeSlotDto) {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 08:00)',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 10:00)',
  })
  @IsOptional()
  endTime?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}