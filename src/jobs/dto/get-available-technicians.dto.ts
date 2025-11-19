import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAvailableTechniciansDto {
  @IsNotEmpty()
  @IsDateString()
  scheduledDate: string;

  @IsNotEmpty()
  @IsString()
  timeSlotId: string;
}