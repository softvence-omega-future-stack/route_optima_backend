import { BadRequestException, Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { Prisma } from '@prisma/client';
import { GetAllTechniciansDto } from './dto/get-all-technicians-dto';

@Injectable()
export class TechnicianService {
  constructor(private prisma: PrismaService) { }

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
          throw new ConflictException('Technician with this phone already exists');
        }
      }

      const technician = await this.prisma.technician.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          region: dto.region,
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
            throw new ConflictException('Technician with this phone number already exists');
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
      if (error instanceof BadRequestException || error instanceof ConflictException) {
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
      const { search, region, isActive, page = 1, limit = 10 } = dto;

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
          // Search across name, phone, and region (case-insensitive, partial match)
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { phone: { contains: search, mode: 'insensitive' } },
                  { region: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          // Filter by region (case-insensitive, partial match)
          region
            ? { region: { contains: region, mode: 'insensitive' } }
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
            region: true,
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

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        technicians,
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


}
