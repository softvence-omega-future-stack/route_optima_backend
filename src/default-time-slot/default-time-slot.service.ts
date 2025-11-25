import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDefaultTimeSlotDto } from './dto/create-default-time-slot.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateTimeLabel } from './utils/time-label.util';
import { UpdateDefaultTimeSlotDto } from './dto/update-default-time-slot.dto';

@Injectable()
export class DefaultTimeSlotService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateDefaultTimeSlotDto) {
    try {
      // Validate that endTime is after startTime
      if (createDto.startTime >= createDto.endTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for overlapping time slots during creation
      await this.checkForOverlappingSlots(
        createDto.startTime,
        createDto.endTime,
      );

      // Auto-generate label from times
      const label = generateTimeLabel(createDto.startTime, createDto.endTime);

      // If order is not provided, set it to the next available order
      if (!createDto.order) {
        const maxOrder = await this.prisma.defaultTimeSlot.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        createDto.order = maxOrder ? maxOrder.order + 1 : 1;
      }

      return await this.prisma.defaultTimeSlot.create({
        data: {
          ...createDto,
          label,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create default time slot',
      );
    }
  }

  async update(id: string, updateDto: UpdateDefaultTimeSlotDto) {
    try {
      // Check if time slot exists
      const existingSlot = await this.prisma.defaultTimeSlot.findUnique({
        where: { id },
        include: {
            jobs: true,
        }
      });

      if (!existingSlot) {
        throw new NotFoundException('Time slot not found');
      }

      // Check if time slot has booked jobs (prevent updates if booked)
      if (existingSlot.jobs && existingSlot.jobs.length > 0) {
        throw new BadRequestException(
          `Cannot update time slot. It is referenced by ${existingSlot.jobs.length} job. ` +
          `Please reassign or delete the related jobs first.`
        );
      }

      // If times are being updated, validate them
      if (updateDto.startTime || updateDto.endTime) {
        const startTime = updateDto.startTime || existingSlot.startTime;
        const endTime = updateDto.endTime || existingSlot.endTime;

        // Validate that endTime is after startTime
        if (startTime >= endTime) {
          throw new BadRequestException('End time must be after start time');
        }

        // Check for overlapping time slots (excluding current slot)
        await this.checkForOverlappingSlots(startTime, endTime, id);
      }

      // Generate new label if times are updated
      let label = existingSlot.label;
      if (updateDto.startTime || updateDto.endTime) {
        const startTime = updateDto.startTime || existingSlot.startTime;
        const endTime = updateDto.endTime || existingSlot.endTime;
        label = generateTimeLabel(startTime, endTime);
      }

      return await this.prisma.defaultTimeSlot.update({
        where: { id },
        data: {
          ...updateDto,
          ...(label !== existingSlot.label && { label }), 
        },
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to update default time slot',
      );
    }
  }

  async findAll() {
    try {
      return await this.prisma.defaultTimeSlot.findMany({
        orderBy: { order: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch time slots');
    }
  }

  private async checkForOverlappingSlots(
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const overlappingSlot = await this.prisma.defaultTimeSlot.findFirst({
      where: {
        ...(excludeId && { id: { not: excludeId } }),
        AND: [{ startTime }, { endTime }],
      },
    });

    if (overlappingSlot) {
      throw new BadRequestException(
        `Time slot overlaps with existing slot: ${overlappingSlot.label}`,
      );
    }
  }

  async remove(id: string) {
    try {
      // Check if time slot exists
      const existingSlot = await this.prisma.defaultTimeSlot.findUnique({
        where: { id },
        include: {
          jobs: true,
        },
      });

      if (!existingSlot) {
        throw new NotFoundException('Time slot not found');
      }

      // Check if there are related jobs
      if (existingSlot.jobs && existingSlot.jobs.length > 0) {
        throw new BadRequestException(
          `Cannot delete time slot. It is referenced by ${existingSlot.jobs.length} jobs. ` +
            `Please reassign or delete the related jobs first.`,
        );
      }

      await this.prisma.defaultTimeSlot.delete({
        where: { id },
      });

      return { message: 'Time slot deleted successfully' };
    } catch (error) {
      // console.log(error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete time slot');
    }
  }
}
