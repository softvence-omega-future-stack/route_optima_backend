import { IsDateString, IsOptional } from 'class-validator';

export class GetStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
