import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from 'src/lib/responseHandler';
import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'prisma/prisma.service';


@Injectable()
export class JobsService {

  constructor(private prisma: PrismaService) { }

  async createJob(createJobDto: CreateJobDto) {
    try {


      console.log('Received createJobDto:', createJobDto);
      console.log('Technician ID:', createJobDto.technicianId);
      console.log('TimeSlot ID:', createJobDto.timeSlotId);

      // Verify technician exists
      if (!createJobDto.technicianId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Technician ID is required',
          null
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
          null
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
          null
        );
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

          // Optional geolocation
          latitude: createJobDto.latitude,
          longitude: createJobDto.longitude,
        },
        include: {
          timeSlot: true,
          technician: true,
        },
      });

      return sendResponse(
        HttpStatus.CREATED,
        true,
        'Job created successfully',
        job
      );
    } catch (error) {
      console.error('Error creating job:', error);

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to create job',
        null
      );
    }
  }



}