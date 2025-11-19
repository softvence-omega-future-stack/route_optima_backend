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
import { NotificationPreferencesService } from 'src/notification-preferences/notification-preferences.service';
import { MailService } from 'src/mail/mail.service';
import { GetAvailableTechniciansDto } from './dto/get-available-technicians.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private geocoderUtil: GeocoderUtil,
    private twilioUtil: TwilioUtil,
    private addressParser: AddressParserUtil,
    private notificationPreferencesService: NotificationPreferencesService,
    private mailService: MailService,
  ) {}

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private shouldAutoCompleteJob(job: any): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDate = now.toISOString().split('T')[0];
    const jobDate = job.scheduledDate.toISOString().split('T')[0];

    // Check if job date is today or in past AND time slot has ended
    return jobDate <= currentDate && job.timeSlot.endTime < currentTime;
  }

  async createJob(createJobDto: CreateJobDto) {
    try {
      this.logger.log('Creating new job...');

      // 1. Validate technician
      if (!createJobDto.technicianId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Technician ID is required',
        );
      }

      if (!createJobDto.timeSlotId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Time slot ID is required',
        );
      }

      const technician = await this.prisma.technician.findUnique({
        where: { id: createJobDto.technicianId },
      });

      if (!technician) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'Technician not found',
        );
      }

      if (!technician.isActive) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'This technician is inactive and cannot be assigned to a job.',
        );
      }

      // technician working hours check
      if (technician.workStartTime && technician.workEndTime) {
        const timeSlot = await this.prisma.defaultTimeSlot.findUnique({
          where: { id: createJobDto.timeSlotId },
        });

        if (!timeSlot) {
          return sendResponse(
            HttpStatus.NOT_FOUND,
            false,
            'Time slot not found',
          );
        }

        // Convert times to minutes for comparison
        const workStartMinutes = this.timeToMinutes(technician.workStartTime);
        const workEndMinutes = this.timeToMinutes(technician.workEndTime);
        const slotStartMinutes = this.timeToMinutes(timeSlot.startTime);
        const slotEndMinutes = this.timeToMinutes(timeSlot.endTime);

        // Check if time slot falls within technician's working hours
        if (
          slotStartMinutes < workStartMinutes ||
          slotEndMinutes > workEndMinutes
        ) {
          return sendResponse(
            HttpStatus.BAD_REQUEST,
            false,
            `Selected time slot (${timeSlot.startTime}-${timeSlot.endTime}) is outside technician's working hours (${technician.workStartTime}-${technician.workEndTime})`,
          );
        }
      }

      const conflict = await this.prisma.job.findFirst({
        where: {
          technicianId: createJobDto.technicianId,
          scheduledDate: new Date(createJobDto.scheduledDate),
          timeSlotId: createJobDto.timeSlotId,
          status: JobStatus.ASSIGNED,
        },
      });

      if (conflict) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'This technician is already booked for the same date and time slot.',
        );
      }

      const timeSlot = await this.prisma.defaultTimeSlot.findUnique({
        where: { id: createJobDto.timeSlotId },
      });

      if (!timeSlot) {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Time slot not found');
      }

      // 2. Parse address
      const parsedAddress = await this.addressParser.parseAddress(
        createJobDto.serviceAddress,
      );

      // 3. Geocode fallback
      let { latitude, longitude } = createJobDto;

      if (!latitude || !longitude) {
        const geo = await this.geocoderUtil.geocodeAddress(
          createJobDto.serviceAddress,
        );
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      // 4. Create job
      const job = await this.prisma.job.create({
        data: {
          customerName: createJobDto.customerName,
          customerPhone: createJobDto.customerPhone,
          customerEmail: createJobDto.customerEmail,

          serviceAddress: createJobDto.serviceAddress,
          street: parsedAddress.street,
          city: parsedAddress.city,
          state: parsedAddress.state,
          stateCode: parsedAddress.stateCode,
          zipCode: parsedAddress.zipCode ?? createJobDto.zipCode,

          jobDescription: createJobDto.jobDescription,
          scheduledDate: createJobDto.scheduledDate,

          timeSlotId: createJobDto.timeSlotId,
          technicianId: createJobDto.technicianId,

          latitude: latitude ?? null,
          longitude: longitude ?? null,
        },
        include: {
          timeSlot: true,
          technician: true,
        },
      });

      // 5. Load global preferences
      const preferences =
        await this.notificationPreferencesService.getPreferences();

      // EMAIL ----------------------------
      let emailStatus = { sent: false, message: 'Email disabled' };

      const customerWantsEmail =
        job.customerEmail && preferences.sendCustomerEmail;

      if (customerWantsEmail) {
        const emailResult = await this.mailService.sendJobConfirmationEmail(
          job,
          job.technician,
          preferences,
        );

        emailStatus = {
          sent: emailResult.sent,
          message: emailResult.message,
        };
      }

      // SMS ------------------------------
      let smsStatus = { sent: false, message: 'SMS disabled' };

      const technicianWantsSMS =
        technician.phone && preferences.sendTechnicianSMS;

      if (technicianWantsSMS) {
        const message = `
          New Job Assigned

          Customer: ${job.customerName}
          Address: ${job.serviceAddress}
          Phone: ${job.customerPhone}

          Date: ${job.scheduledDate.toISOString().split('T')[0]}
          Time Slot: ${job.timeSlot?.label ?? 'N/A'}

          Job Details: ${job.jobDescription}

          — Dispatch Bros
        `.trim();

        const smsResult = await this.twilioUtil.sendSMS(
          technician.phone,
          message,
        );

        console.log('This is the sms result ->', smsResult);

        smsStatus = {
          sent: smsResult.success,
          message: smsResult.message,
        };
      }

      // 7. Response
      return sendResponse(
        HttpStatus.CREATED,
        true,
        'Job created successfully',
        job,
        { emailStatus, smsStatus },
      );
    } catch (error) {
      this.logger.error(error);
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to create job',
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

      // Filter by status - only allow valid JobStatus values
      if (
        status &&
        (status === JobStatus.ASSIGNED || status === JobStatus.COMPLETED)
      ) {
        where.status = status;
      } else if (status) {
        // Log warning but don't apply invalid status filter
        this.logger.warn(`Invalid status filter ignored: ${status}`);
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

      // AUTO-COMPLETE: Update jobs that have expired time slots
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          if (
            job.status === JobStatus.ASSIGNED &&
            this.shouldAutoCompleteJob(job)
          ) {
            return await this.prisma.job.update({
              where: { id: job.id },
              data: {
                status: JobStatus.COMPLETED,
                updatedAt: new Date(),
              },
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
            });
          }
          return job;
        }),
      );

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
        updatedJobs,
      };

      // Return meaningful message when no jobs found
      if (updatedJobs.length === 0) {
        return sendResponse(
          HttpStatus.OK,
          true,
          'No jobs found matching your criteria',
          // paginationData,
        );
      }

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

      // AUTO-COMPLETE: Update job if time slot has ended
      let updatedJob = job;
      if (
        job.status === JobStatus.ASSIGNED &&
        this.shouldAutoCompleteJob(job)
      ) {
        updatedJob = await this.prisma.job.update({
          where: { id },
          data: {
            status: JobStatus.COMPLETED,
            updatedAt: new Date(),
          },
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
      }

      return sendResponse(
        HttpStatus.OK,
        true,
        'Job fetched successfully',
        updatedJob,
      );
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
        assignedJobs,
        completedJobs,
        totalTechnicians,
        activeTechnicians,
        assignedThisWeek, //  Assigned jobs in current week
      ] = await Promise.all([
        // Total jobs
        this.prisma.job.count({ where: dateFilter }),

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

      const pendingJobs = assignedJobs - completedJobs;

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

  // Add this method to your JobsService class
  async deleteJob(id: string) {
    try {
      this.logger.log(`Attempting to delete job with ID: ${id}`);

      // Validate ID format
      if (!id || id.trim() === '') {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Job ID is required',
        );
      }

      // Check if job exists
      const existingJob = await this.prisma.job.findUnique({
        where: { id },
        include: {
          timeSlot: true,
          technician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingJob) {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Job not found');
      }

      // Check if job is in the past (optional business rule)
      const now = new Date();
      const jobDateTime = new Date(existingJob.scheduledDate);

      // If you want to prevent deletion of past jobs, uncomment this:
      // if (jobDateTime < now) {
      //   return sendResponse(
      //     HttpStatus.BAD_REQUEST,
      //     false,
      //     'Cannot delete past jobs',
      //   );
      // }

      // Additional validation: Check if job is scheduled for today and time slot hasn't ended
      const today = new Date().toISOString().split('T')[0];
      const jobDate = existingJob.scheduledDate.toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5);

      if (jobDate === today && existingJob.timeSlot.endTime > currentTime) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          `Cannot delete job that is scheduled for today and hasn't ended yet (Time slot: ${existingJob.timeSlot.startTime}-${existingJob.timeSlot.endTime})`,
        );
      }

      // Delete the job
      await this.prisma.job.delete({
        where: { id },
      });

      this.logger.log(`Job deleted successfully: ${id}`);

      return sendResponse(HttpStatus.OK, true, 'Job deleted successfully');
    } catch (error) {
      this.logger.error(`Error deleting job ${id}:`, error);

      // Handle Prisma specific errors
      if (error.code === 'P2025') {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Job not found');
      }

      // Handle foreign key constraint violations
      if (error.code === 'P2003') {
        return sendResponse(
          HttpStatus.CONFLICT,
          false,
          'Cannot delete job due to existing references',
        );
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to delete job',
      );
    }
  }

  async getAvailableTechnicians(
    getAvailableTechniciansDto: GetAvailableTechniciansDto,
  ) {
    try {
      this.logger.log('Fetching available technicians...');

      const { scheduledDate, timeSlotId } = getAvailableTechniciansDto;

      // Validate inputs
      if (!scheduledDate || !timeSlotId) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Scheduled date and time slot ID are required',
        );
      }

      // Validate date format
      const scheduledDateTime = new Date(scheduledDate);
      if (isNaN(scheduledDateTime.getTime())) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Invalid scheduled date format. Use YYYY-MM-DD format.',
        );
      }

      // Validate date is today or future - PROPER FIX
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today

      const inputDate = new Date(scheduledDate);
      inputDate.setHours(0, 0, 0, 0); // Set to start of input date

      // Compare timestamps
      if (inputDate.getTime() < today.getTime()) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Please select today or a future date.',
        );
      }

      // Validate time slot exists
      const timeSlot = await this.prisma.defaultTimeSlot.findUnique({
        where: { id: timeSlotId },
      });

      if (!timeSlot) {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Time slot not found');
      }

      if (!timeSlot.isActive) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Time slot is not active',
        );
      }

      // Get all active technicians - ONLY SELECT ID AND NAME
      const activeTechnicians = await this.prisma.technician.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (activeTechnicians.length === 0) {
        return sendResponse(
          HttpStatus.OK,
          true,
          'No active technicians found',
          [],
        );
      }

      // Check for conflicting jobs for each technician
      const availableTechnicians = await Promise.all(
        activeTechnicians.map(async (technician) => {
          // Check if technician has any job at the same date and time slot
          const conflictingJob = await this.prisma.job.findFirst({
            where: {
              technicianId: technician.id,
              scheduledDate: scheduledDateTime,
              timeSlotId: timeSlotId,
              status: JobStatus.ASSIGNED,
            },
          });

          const isAvailable = !conflictingJob;

          // Only return id and name for available technicians
          if (isAvailable) {
            return {
              id: technician.id,
              name: technician.name,
            };
          }
          return null; // Return null for unavailable technicians
        }),
      );

      // Filter out null values (unavailable technicians) and get only available ones
      const available = availableTechnicians.filter((t) => t !== null);

      const result = {
        scheduledDate: scheduledDateTime.toISOString().split('T')[0],
        timeSlot: {
          id: timeSlot.id,
          label: timeSlot.label,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
        },
        availableTechnicians: available,
        summary: {
          total: activeTechnicians.length,
          available: available.length,
          unavailable: activeTechnicians.length - available.length,
        },
      };

      return sendResponse(
        HttpStatus.OK,
        true,
        'Available technicians fetched successfully',
        result,
      );
    } catch (error) {
      this.logger.error('Error fetching available technicians:', error);

      // Handle specific Prisma errors
      if (error.code === 'P2025') {
        return sendResponse(HttpStatus.NOT_FOUND, false, 'Time slot not found');
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to fetch available technicians',
      );
    }
  }
}
