import { IsString, IsNotEmpty, Matches, IsOptional, IsInt, Min } from 'class-validator';

export class CreateDefaultTimeSlotDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 08:00)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 10:00)',
  })
  endTime: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}