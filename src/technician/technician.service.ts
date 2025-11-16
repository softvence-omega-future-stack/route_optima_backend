import {
  BadRequestException,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { JobStatus, Prisma } from '@prisma/client';
import { GetAllTechniciansDto } from './dto/get-all-technicians-dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class TechnicianService {
  constructor(private prisma: PrismaService) {}

  private async deletePhotoFile(photoPath: string | null): Promise<void> {
    if (!photoPath) return;

    try {
      const filename = photoPath.replace('/uploads/', '');
      const fullPath = join(__dirname, '..', '..', 'uploads', filename);

      // Check if file exists before attempting to delete
      if (existsSync(fullPath)) {
        await unlinkSync(fullPath);
        console.log(`Deleted photo file: ${fullPath}`);
      } else {
        console.log(`Photo file not found: ${fullPath}`);
      }
    } catch (error) {
      console.error(`Failed to delete photo file: ${photoPath}`, error);
    }
  }

  private validateWorkHours(startTime: string, endTime: string): void {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('Work end time must be after start time');
    }
  }

  async createTechnician(dto: CreateTechnicianDto) {
    try {
      // Validate work hours if both are provided
      if (dto.workStartTime && dto.workEndTime) {
        this.validateWorkHours(dto.workStartTime, dto.workEndTime);
      }

      // Optional: check if technician already exists by phone number
      if (dto.phone) {
        const existing = await this.prisma.technician.findFirst({
          where: { phone: dto.phone },
        });
        if (existing) {
          throw new ConflictException(
            'Technician with this phone already exists',
          );
        }
      }

      const technician = await this.prisma.technician.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          workStartTime: dto.workStartTime || null,
          workEndTime: dto.workEndTime || null,
          isActive: dto.isActive ?? true,
          photo: dto.photo,
        },
      });

      return {
        message: 'Technician created successfully',
        technician,
      };
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            // Unique constraint violation
            throw new ConflictException(
              'Technician with this phone number already exists',
            );
          case 'P2003':
            // Foreign key constraint violation
            throw new BadRequestException('Invalid reference data provided');
          case 'P2025':
            // Record not found
            throw new BadRequestException('Required related record not found');
          default:
            console.error('Prisma error:', error);
            throw new InternalServerErrorException('Database operation failed');
        }
      }

      // Handle NestJS HTTP exceptions (like the ConflictException we threw)
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid data provided');
      }

      // Handle unknown errors
      console.error('Unexpected error in createTechnician:', error);
      throw new InternalServerErrorException('Failed to create technician');
    }
  }

  async getAllTechnicians(dto: GetAllTechniciansDto) {
    try {
      const { search, address, isActive, page = 1, limit = 10 } = dto;

      // Validate pagination parameters
      if (page < 1) {
        throw new BadRequestException('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build where clause with fuzzy search
      const whereClause: Prisma.TechnicianWhereInput = {
        AND: [
          // Search across name, phone, and address (case-insensitive, partial match)
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { phone: { contains: search, mode: 'insensitive' } },
                  { address: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          // Filter by address (case-insensitive, partial match)
          address
            ? { address: { contains: address, mode: 'insensitive' } }
            : {},
          // Filter by active status
          isActive !== undefined ? { isActive } : {},
        ],
      };

      // Execute query with pagination
      const [technicians, totalCount] = await Promise.all([
        this.prisma.technician.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            workStartTime: true,
            workEndTime: true,
            photo: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.technician.count({ where: whereClause }),
      ]);

      // Get today's date range for job statistics
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get job statistics for each technician
      const techniciansWithStats = await Promise.all(
        technicians.map(async (technician) => {
          // Get today's assigned jobs count
          const todayAssigned = await this.prisma.job.count({
            where: {
              technicianId: technician.id,
              scheduledDate: {
                gte: todayStart,
                lt: todayEnd,
              },
              status: {
                in: [JobStatus.ASSIGNED, JobStatus.COMPLETED],
              },
            },
          });

          // Get today's completed jobs count
          const todayCompleted = await this.prisma.job.count({
            where: {
              technicianId: technician.id,
              updatedAt: {
                gte: todayStart,
                lt: todayEnd,
              },
              status: JobStatus.COMPLETED,
            },
          });

          // Get total overall assigned jobs count (all time)
          const totalAssigned = await this.prisma.job.count({
            where: {
              technicianId: technician.id,
              status: {
                in: [JobStatus.ASSIGNED, JobStatus.COMPLETED],
              },
            },
          });

          // Get total overall completed jobs count (all time)
          const totalCompleted = await this.prisma.job.count({
            where: {
              technicianId: technician.id,
              status: JobStatus.COMPLETED,
            },
          });

          // Calculate pending jobs based on formula
          const todayPending = todayAssigned - todayCompleted;
          const totalPending = totalAssigned - totalCompleted;

          return {
            ...technician,
            todayStats: {
              assigned: todayAssigned,
              completed: todayCompleted,
              pending: todayPending,
            },
            overallStats: {
              assigned: totalAssigned,
              completed: totalCompleted,
              pending: totalPending,
              completionRate:
                totalAssigned > 0
                  ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2))
                  : 0,
            },
          };
        }),
      );

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        technicians: techniciansWithStats,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      };
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in getAllTechnicians:', error);
        throw new InternalServerErrorException('Database query failed');
      }

      // Handle NestJS HTTP exceptions
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid query parameters');
      }

      // Handle unknown errors
      console.error('Unexpected error in getAllTechnicians:', error);
      throw new InternalServerErrorException('Failed to retrieve technicians');
    }
  }

  async getTechnicianById(id: string) {
    try {
      // Validate ID format
      if (!id || id.trim() === '') {
        throw new BadRequestException('Invalid technician ID');
      }

      const technician = await this.prisma.technician.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          workStartTime: true,
          workEndTime: true,
          photo: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!technician) {
        throw new NotFoundException(`Technician with ID ${id} not found`);
      }

      // Get today's date range for job statistics
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get job statistics for the technician
      const [todayAssigned, todayCompleted, totalAssigned, totalCompleted] =
        await Promise.all([
          // Today's assigned jobs count (scheduled jobs for today)
          this.prisma.job.count({
            where: {
              technicianId: technician.id,
              scheduledDate: {
                gte: todayStart,
                lt: todayEnd,
              },
              status: {
                in: [JobStatus.ASSIGNED, JobStatus.COMPLETED],
              },
            },
          }),

          // Today's completed jobs count
          this.prisma.job.count({
            where: {
              technicianId: technician.id,
              updatedAt: {
                gte: todayStart,
                lt: todayEnd,
              },
              status: JobStatus.COMPLETED,
            },
          }),

          // Total assigned jobs (all time - ASSIGNED + COMPLETED)
          this.prisma.job.count({
            where: {
              technicianId: technician.id,
              status: { in: [JobStatus.ASSIGNED, JobStatus.COMPLETED] },
            },
          }),

          // Total completed jobs (all time)
          this.prisma.job.count({
            where: {
              technicianId: technician.id,
              status: JobStatus.COMPLETED,
            },
          }),
        ]);

      // Calculate pending jobs
      const todayPending = todayAssigned - todayCompleted;
      const totalPending = totalAssigned - totalCompleted;

      // Add statistics to technician response
      const technicianWithStats = {
        ...technician,
        stats: {
          today: {
            assigned: todayAssigned,
            completed: todayCompleted,
            pending: todayPending,
          },
          overall: {
            totalAssigned: totalAssigned,
            totalCompleted: totalCompleted,
            totalPending: totalPending,
            completionRate:
              totalAssigned > 0
                ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2))
                : 0,
          },
        },
      };

      return {
        success: true,
        message: 'Technician retrieved successfully',
        data: technicianWithStats,
      };
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2025':
            throw new NotFoundException(`Technician with ID ${id} not found`);
          default:
            console.error('Prisma error in getTechnicianById:', error);
            throw new InternalServerErrorException('Database query failed');
        }
      }

      // Handle NestJS HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid technician ID format');
      }

      // Handle unknown errors
      console.error('Unexpected error in getTechnicianById:', error);
      throw new InternalServerErrorException('Failed to retrieve technician');
    }
  }

  async getTechnicianDetailsById(id: string) {
  try {
    // Validate ID format
    if (!id || id.trim() === '') {
      throw new BadRequestException('Invalid technician ID');
    }

    const technician = await this.prisma.technician.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        workStartTime: true,
        workEndTime: true,
        photo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!technician) {
      throw new NotFoundException(`Technician with ID ${id} not found`);
    }

    // Get today's date range for job statistics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get job statistics and details for the technician
    const [
      todayAssigned,
      todayCompleted,
      totalAssigned,
      totalCompleted,
      todayJobs,
      recentJobs,
      upcomingJobs
    ] = await Promise.all([
      // Today's assigned jobs count (scheduled jobs for today)
      this.prisma.job.count({
        where: {
          technicianId: technician.id,
          scheduledDate: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: {
            in: [JobStatus.ASSIGNED, JobStatus.COMPLETED],
          },
        },
      }),

      // Today's completed jobs count
      this.prisma.job.count({
        where: {
          technicianId: technician.id,
          updatedAt: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: JobStatus.COMPLETED,
        },
      }),

      // Total assigned jobs (all time - ASSIGNED + COMPLETED)
      this.prisma.job.count({
        where: {
          technicianId: technician.id,
          status: { in: [JobStatus.ASSIGNED, JobStatus.COMPLETED] },
        },
      }),

      // Total completed jobs (all time)
      this.prisma.job.count({
        where: {
          technicianId: technician.id,
          status: JobStatus.COMPLETED,
        },
      }),

      // Today's jobs with details
      this.prisma.job.findMany({
        where: {
          technicianId: technician.id,
          scheduledDate: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: {
            in: [JobStatus.ASSIGNED, JobStatus.COMPLETED],
          },
        },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          serviceAddress: true,
          scheduledDate: true,
          status: true,
          jobDescription: true,
          createdAt: true,
          updatedAt: true,
          timeSlot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
      }),

      // Recent completed jobs (last 5)
      this.prisma.job.findMany({
        where: {
          technicianId: technician.id,
          status: JobStatus.COMPLETED,
        },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          serviceAddress: true,
          scheduledDate: true,
          status: true,
          jobDescription: true,
          updatedAt: true,
          createdAt: true,
          timeSlot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 5,
      }),

      // Upcoming assigned jobs (next 5)
      this.prisma.job.findMany({
        where: {
          technicianId: technician.id,
          status: JobStatus.ASSIGNED,
          scheduledDate: {
            gte: todayStart,
          },
        },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          serviceAddress: true,
          scheduledDate: true,
          status: true,
          jobDescription: true,
          createdAt: true,
          timeSlot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
        take: 5,
      }),
    ]);

    // Calculate pending jobs
    const todayPending = todayAssigned - todayCompleted;
    const totalPending = totalAssigned - totalCompleted;

    // Add statistics and job details to technician response
    const technicianWithStats = {
      ...technician,
      stats: {
        today: {
          assigned: todayAssigned,
          completed: todayCompleted,
          pending: todayPending,
        },
        overall: {
          totalAssigned: totalAssigned,
          totalCompleted: totalCompleted,
          totalPending: totalPending,
          completionRate:
            totalAssigned > 0
              ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2))
              : 0,
        },
      },
      jobDetails: {
        todayJobs: {
          count: todayJobs.length,
          jobs: todayJobs,
        },
        recentCompleted: {
          count: recentJobs.length,
          jobs: recentJobs,
        },
        upcomingJobs: {
          count: upcomingJobs.length,
          jobs: upcomingJobs,
        },
      },
    };

    return {
      success: true,
      message: 'Technician retrieved successfully',
      data: technicianWithStats,
    };
  } catch (error) {
    // Handle known Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException(`Technician with ID ${id} not found`);
        default:
          console.error('Prisma error in getTechnicianById:', error);
          throw new InternalServerErrorException('Database query failed');
      }
    }

    // Handle NestJS HTTP exceptions
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    // Handle validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException('Invalid technician ID format');
    }

    // Handle unknown errors
    console.error('Unexpected error in getTechnicianById:', error);
    throw new InternalServerErrorException('Failed to retrieve technician');
  }
}

  async updateTechnician(id: string, dto: UpdateTechnicianDto) {
    try {
      // Check if technician exists
      const existingTechnician = await this.prisma.technician.findUnique({
        where: { id },
      });

      if (!existingTechnician) {
        throw new NotFoundException(`Technician with ID ${id} not found`);
      }

      // Validate work hours if both are provided
      const startTime = dto.workStartTime || existingTechnician.workStartTime;
      const endTime = dto.workEndTime || existingTechnician.workEndTime;

      if (startTime && endTime) {
        this.validateWorkHours(startTime, endTime);
      }

      // Check if phone number is being updated and if it conflicts with another technician
      if (dto.phone && dto.phone !== existingTechnician.phone) {
        const phoneExists = await this.prisma.technician.findFirst({
          where: {
            phone: dto.phone,
            id: { not: id }, // Exclude current technician
          },
        });

        if (phoneExists) {
          throw new ConflictException(
            'Phone number already in use by another technician',
          );
        }
      }

      // Prepare update data - only include fields that are provided
      const updateData: Prisma.TechnicianUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.workStartTime !== undefined)
        updateData.workStartTime = dto.workStartTime;
      if (dto.workEndTime !== undefined)
        updateData.workEndTime = dto.workEndTime;
      if (dto.photo !== undefined) updateData.photo = dto.photo;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      // Update the technician
      const technician = await this.prisma.technician.update({
        where: { id },
        data: updateData,
      });

      return {
        message: 'Technician updated successfully',
        technician,
      };
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new ConflictException('Phone number already in use');
          case 'P2025':
            throw new NotFoundException(`Technician with ID ${id} not found`);
          case 'P2003':
            throw new BadRequestException('Invalid reference data provided');
          default:
            console.error('Prisma error in updateTechnician:', error);
            throw new InternalServerErrorException('Database operation failed');
        }
      }

      // Handle NestJS HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid data provided');
      }

      // Handle unknown errors
      console.error('Unexpected error in updateTechnician:', error);
      throw new InternalServerErrorException('Failed to update technician');
    }
  }

  async deleteTechnician(id: string) {
    try {
      // Validate ID format
      if (!id || id.trim() === '') {
        throw new BadRequestException('Invalid technician ID');
      }

      // First, get the technician to retrieve the photo path
      const technician = await this.prisma.technician.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          photo: true,
        },
      });

      if (!technician) {
        throw new NotFoundException(`Technician with ID ${id} not found`);
      }

      // Delete the technician from database
      await this.prisma.technician.delete({
        where: { id },
      });

      // Delete the photo file if it exists
      if (technician.photo) {
        await this.deletePhotoFile(technician.photo);
      }

      return {
        message: 'Technician deleted successfully',
      };
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2025':
            throw new NotFoundException(`Technician with ID ${id} not found`);
          case 'P2003':
            throw new BadRequestException(
              'Cannot delete technician: related records exist. Please remove related data first.',
            );
          default:
            console.error('Prisma error in deleteTechnician:', error);
            throw new InternalServerErrorException('Database operation failed');
        }
      }

      // Handle NestJS HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid technician ID format');
      }

      // Handle unknown errors
      console.error('Unexpected error in deleteTechnician:', error);
      throw new InternalServerErrorException('Failed to delete technician');
    }
  }
}
