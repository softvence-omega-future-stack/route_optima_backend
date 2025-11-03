import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        message: 'Users fetched successfully',
        data: users,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }
}
