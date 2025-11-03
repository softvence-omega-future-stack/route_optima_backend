import { JobStatus } from '@prisma/client';

export class JobResponseDto {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  jobDescription?: string;
  serviceAddress: string;
  zipCode?: string;
  scheduledDate: Date;
  status: JobStatus;
  technicianId: string;
  timeSlotId: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  state?: string | null;
  createdAt: Date;
  updatedAt: Date;
}