import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from 'src/lib/responseHandler';
import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'prisma/prisma.service';
import { GeocoderUtil } from 'src/utils/geocoder.util';
import { TwilioUtil } from 'src/utils/twilio.util';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private geocoderUtil: GeocoderUtil,
    private twilioUtil: TwilioUtil,
  ) {}

  async createJob(createJobDto: CreateJobDto) {
    try {
      this.logger.log('Creating new job...');

      // Verify technician exists
      if (!createJobDto.technicianId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Technician ID is required',
          null,
        );
      }

      if (!createJobDto.timeSlotId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Time slot ID is required',
          null,
        );
      }

      // Verify technician exists
      const technician = await this.prisma.technician.findUnique({
        where: { id: createJobDto.technicianId },
      });

      if (!technician) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'Technician not found',
          null,
        );
      }

      // Verify time slot exists
      const timeSlot = await this.prisma.defaultTimeSlot.findUnique({
        where: { id: createJobDto.timeSlotId },
      });

      if (!timeSlot) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'Time slot not found',
          null,
        );
      }

      // Geocode the service address if lat/lng not provided
      let latitude = createJobDto.latitude;
      let longitude = createJobDto.longitude;

      if (!latitude || !longitude) {
        this.logger.log(`Geocoding address: ${createJobDto.serviceAddress}`);
        const geocodeResult = await this.geocoderUtil.geocodeAddress(
          createJobDto.serviceAddress,
        );

        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          this.logger.log(
            `Geocoding successful - Lat: ${latitude}, Lng: ${longitude}`,
          );
        } else {
          this.logger.warn(
            `Geocoding failed for address: ${createJobDto.serviceAddress}`,
          );
          // Continue without coordinates - don't fail the job creation
        }
      }

      // Create the job
      const job = await this.prisma.job.create({
        data: {
          // Customer Information
          customerName: createJobDto.customerName,
          customerPhone: createJobDto.customerPhone,
          customerEmail: createJobDto.customerEmail,
          serviceAddress: createJobDto.serviceAddress,
          zipCode: createJobDto.zipCode,

          // Job Details
          jobDescription: createJobDto.jobDescription,

          // Schedule Information
          scheduledDate: createJobDto.scheduledDate,
          timeSlotId: createJobDto.timeSlotId,
          technicianId: createJobDto.technicianId,

          // geolocation
          latitude: latitude,
          longitude: longitude,
        },
        include: {
          timeSlot: true,
          technician: true,
        },
      });

      // Check notification preferences
      const notificationPref =
        await this.prisma.notificationPreferences.findUnique({
          where: { id: 'singleton' },
        });

        this.logger.debug(`Notification preferences: ${JSON.stringify(notificationPref)}`);

      if (notificationPref?.sendTechnicianSMS) {
        const technicianPhone = job.technician.phone;
        const message = `New job assigned: ${job.jobDescription}. Scheduled for ${job.scheduledDate.toLocaleString()} at ${job.serviceAddress}.`;

        await this.twilioUtil.sendSMS(technicianPhone, message);
      } else {
        this.logger.log('SMS notifications are turned OFF — skipping SMS.');
      }

      return sendResponse(
        HttpStatus.CREATED,
        true,
        'Job created successfully',
        job,
      );
    } catch (error) {
      this.logger.error('Error creating job:', error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to create job',
        null,
      );
    }
  }
}
