import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateDefaultTimeSlotDto } from './dto/create-default-time-slot.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateTimeLabel } from './utils/time-label.util';

@Injectable()
export class DefaultTimeSlotService {
    constructor(private prisma: PrismaService) {}

  async create(createDto: CreateDefaultTimeSlotDto) {
    try {
      // Validate that endTime is after startTime
      if (createDto.startTime >= createDto.endTime) {
        throw new BadRequestException('End time must be after start time');
      }


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
      throw new InternalServerErrorException('Failed to create default time slot');
    }
  }
}
