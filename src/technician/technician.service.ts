import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';

@Injectable()
export class TechnicianService {
    constructor(private prisma: PrismaService) {}

  async createTechnician(dto: CreateTechnicianDto) {
    // optional: check if technician already exists by phone number
    if (dto.phone) {
      const existing = await this.prisma.technician.findFirst({
        where: { phone: dto.phone },
      });
      if (existing) throw new BadRequestException('Technician with this phone already exists');
    }

    const technician = await this.prisma.technician.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        region: dto.region,
        workStartTime: dto.workStartTime ? new Date(dto.workStartTime) : null,
        workEndTime: dto.workEndTime ? new Date(dto.workEndTime) : null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Technician created successfully',
      technician,
    };
  }
}
