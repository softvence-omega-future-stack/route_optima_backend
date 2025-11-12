import { IsBoolean } from 'class-validator';

export class UpdateSmsPreferenceDto {
  @IsBoolean()
  sendTechnicianSMS: boolean;
}