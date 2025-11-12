import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { sendResponse } from 'src/lib/responseHandler';
import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'prisma/prisma.service';
import { GeocoderUtil } from 'src/utils/geocoder.util';
import { TwilioUtil } from 'src/utils/twilio.util';
import { GetJobsDto } from './dto/get-jobs.dto';
import { AddressParserUtil } from 'src/utils/address-parser.util';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetStatsDto } from './dto/get-stats.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private geocoderUtil: GeocoderUtil,
    private twilioUtil: TwilioUtil,
    private addressParser: AddressParserUtil,
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

      // Parse address with geocoding primary + regex fallback
      this.logger.log(`Parsing address: ${createJobDto.serviceAddress}`);
      const parsedAddress = await this.addressParser.parseAddress(
        createJobDto.serviceAddress,
      );

      this.logger.debug(`Parsed address: ${JSON.stringify(parsedAddress)}`);

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
          street: parsedAddress.street,
          city: parsedAddress.city,
          state: parsedAddress.state,
          stateCode: parsedAddress.stateCode,
          zipCode: parsedAddress.zipCode || createJobDto.zipCode,

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

      this.logger.debug(
        `Notification preferences: ${JSON.stringify(notificationPref)}`,
      );

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

  async getAllJobs(getJobsDto: GetJobsDto) {
    try {
      this.logger.log('Fetching jobs...');

      const {
        city,
        state,
        zipCode,
        customerName,
        customerPhone,
        serviceAddress,
        technicianId,
        technicianName,
        search,
        date,
        scheduledDate,
        status,
        page = 1,
        limit = 10,
      } = getJobsDto;

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      // Filter by city
      if (city) {
        where.city = {
          contains: city,
          mode: 'insensitive',
        };
      }

      // Filter by status
      if (state) {
        where.OR = [
          { state: { contains: state, mode: 'insensitive' } },
          { stateCode: { contains: state, mode: 'insensitive' } },
        ];
      }

      if (zipCode) {
        where.zipCode = {
          contains: zipCode,
          mode: 'insensitive',
        };
      }

      if (customerName) {
        where.customerName = {
          contains: customerName,
          mode: 'insensitive',
        };
      }

      if (customerPhone) {
        where.customerPhone = {
          contains: customerPhone,
          mode: 'insensitive',
        };
      }

      if (serviceAddress) {
        where.serviceAddress = {
          contains: serviceAddress,
          mode: 'insensitive',
        };
      }

      if (technicianId) {
        where.technicianId = technicianId;
      }

      if (technicianName) {
        where.technician = {
          name: {
            contains: technicianName,
            mode: 'insensitive',
          },
        };
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by createdAt date
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        where.createdAt = {
          gte: startDate,
          lt: endDate,
        };
      }

      // Filter by scheduledDate
      if (scheduledDate) {
        const startScheduledDate = new Date(scheduledDate);
        const endScheduledDate = new Date(scheduledDate);
        endScheduledDate.setDate(endScheduledDate.getDate() + 1);

        where.scheduledDate = {
          gte: startScheduledDate,
          lt: endScheduledDate,
        };
      }

      // General search across multiple fields
      if (search && !customerName && !customerPhone && !serviceAddress) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          { serviceAddress: { contains: search, mode: 'insensitive' } },
          { jobDescription: { contains: search, mode: 'insensitive' } },
          { street: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { state: { contains: search, mode: 'insensitive' } },
          { stateCode: { contains: search, mode: 'insensitive' } },
          { zipCode: { contains: search, mode: 'insensitive' } },
          {
            technician: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        ];
      }

      // Get total count for pagination metadata
      const totalCount = await this.prisma.job.count({ where });

      // Fetch jobs with pagination
      const jobs = await this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          timeSlot: true,
          technician: {
            select: {
              id: true,
              name: true,
              phone: true,
              photo: true,
              address: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const paginationData = {
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
        },
        jobs,
      };

      return sendResponse(
        HttpStatus.OK,
        true,
        'Jobs fetched successfully',
        paginationData,
      );
    } catch (error) {
      this.logger.error('Error fetching jobs:', error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to fetch jobs',
        null,
      );
    }
  }

  async getJobById(id: string) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id },
        include: {
          timeSlot: true,
          technician: {
            select: {
              id: true,
              name: true,
              phone: true,
              photo: true,
              address: true,
              workStartTime: true,
              workEndTime: true,
              isActive: true,
            },
          },
        },
      });

      if (!job) {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Job not found', null);
      }

      return sendResponse(HttpStatus.OK, true, 'Job fetched successfully', job);
    } catch (error) {
      this.logger.error('Error fetching job:', error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to fetch job',
        null,
      );
    }
  }

  async updateJob(id: string, updateJobDto: UpdateJobDto) {
    try {
      // Check if job exists
      const existingJob = await this.prisma.job.findUnique({
        where: { id },
      });

      if (!existingJob) {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Job not found', null);
      }

      // If serviceAddress is updated, re-parse address
      let updateData: any = { ...updateJobDto };

      if (updateJobDto.serviceAddress) {
        const parsedAddress = await this.addressParser.parseAddress(
          updateJobDto.serviceAddress,
        );
        updateData = {
          ...updateData,
          street: parsedAddress.street,
          city: parsedAddress.city,
          state: parsedAddress.state,
          stateCode: parsedAddress.stateCode,
        };
      }

      // Validate technician if provided
      if (updateJobDto.technicianId) {
        const technician = await this.prisma.technician.findUnique({
          where: { id: updateJobDto.technicianId },
        });
        if (!technician) {
          return sendResponse(
            HttpStatus.NOT_FOUND,
            false,
            'Technician not found',
            null,
          );
        }
      }

      // Validate timeSlot if provided
      if (updateJobDto.timeSlotId) {
        const timeSlot = await this.prisma.defaultTimeSlot.findUnique({
          where: { id: updateJobDto.timeSlotId },
        });
        if (!timeSlot) {
          return sendResponse(
            HttpStatus.NOT_FOUND,
            false,
            'Time slot not found',
            null,
          );
        }
      }

      // Update the job
      const updatedJob = await this.prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          timeSlot: true,
          technician: true,
        },
      });

      return sendResponse(
        HttpStatus.OK,
        true,
        'Job updated successfully',
        updatedJob,
      );
    } catch (error) {
      this.logger.error('Error updating job:', error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to update job',
        null,
      );
    }
  }

  async getJobStats(getStatsDto: GetStatsDto) {
    try {
      const { startDate, endDate } = getStatsDto;

      // Build date filter if provided
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          dateFilter.createdAt.lt = end;
        }
      }

      // Get current week range
      const currentWeekStart = new Date();
      currentWeekStart.setHours(0, 0, 0, 0);
      currentWeekStart.setDate(
        currentWeekStart.getDate() - currentWeekStart.getDay(),
      ); // Start of week (Sunday)

      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 7); // End of week (Next Sunday)

      // Execute all counts in parallel
      const [
        totalJobs,
        pendingJobs,
        assignedJobs,
        completedJobs,
        totalTechnicians,
        activeTechnicians,
        assignedThisWeek, // NEW: Assigned jobs in current week
      ] = await Promise.all([
        // Total jobs
        this.prisma.job.count({ where: dateFilter }),

        // Pending jobs
        this.prisma.job.count({
          where: { ...dateFilter, status: JobStatus.PENDING },
        }),

        // Assigned jobs
        this.prisma.job.count({
          where: { ...dateFilter, status: JobStatus.ASSIGNED },
        }),

        // Completed jobs
        this.prisma.job.count({
          where: { ...dateFilter, status: JobStatus.COMPLETED },
        }),

        // Total technicians
        this.prisma.technician.count(),

        // Active technicians
        this.prisma.technician.count({ where: { isActive: true } }),

        // NEW: Assigned jobs this week
        this.prisma.job.count({
          where: {
            status: JobStatus.ASSIGNED,
            createdAt: {
              gte: currentWeekStart,
              lt: currentWeekEnd,
            },
          },
        }),
      ]);

      // Calculate rates
      const assignedAndCompletedJobs = assignedJobs + completedJobs;

      const completionRate =
        totalJobs > 0
          ? Number(((completedJobs / totalJobs) * 100).toFixed(2))
          : 0;

      const efficiency =
        assignedAndCompletedJobs > 0
          ? Number(
              ((completedJobs / assignedAndCompletedJobs) * 100).toFixed(2),
            )
          : 0;

      const stats = {
        totalJobs,
        pendingJobs,
        assignedJobs,
        completedJobs,
        totalTechnicians,
        activeTechnicians,
        assignedThisWeek, // NEW FIELD
        completionRate,
        efficiency,
      };

      return sendResponse(
        HttpStatus.OK,
        true,
        'Statistics fetched successfully',
        stats,
      );
    } catch (error) {
      this.logger.error('Error fetching statistics:', error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to fetch statistics',
        null,
      );
    }
  }
}
