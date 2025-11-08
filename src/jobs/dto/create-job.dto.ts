export class CreateJobDto {
  // Customer Information
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceAddress: string;
  zipCode?: string;
  
  // Job Details
  jobDescription: string;
  
  // Schedule Information
  scheduledDate: Date;
  timeSlotId: string;
  technicianId: string;
  
  // Optional geolocation
  latitude?: number;
  longitude?: number;
}