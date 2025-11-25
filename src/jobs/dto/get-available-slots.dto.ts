import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class GetAvailableSlotsDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  technicianId: string;
}