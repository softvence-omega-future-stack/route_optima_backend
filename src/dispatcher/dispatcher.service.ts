import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateDispatcherDto } from './dto/create-dispatcher.dto';
import { UpdateDispatcherDto } from './dto/update-dispatcher.dto';
import * as bcrypt from 'bcryptjs';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class DispatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createDispatcher(createDto: CreateDispatcherDto, mailToDispatcher: boolean = false) {
    const { email, name, password, phone, address, photo, isActive } = createDto;

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if phone number already exists (if provided)
    if (phone) {
      const existingPhone = await this.prisma.dispatcher.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException('Dispatcher with this phone number already exists');
      }
    }

    // Hash the admin-provided password
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      // Create dispatcher and user in a transaction
      const dispatcher = await this.prisma.$transaction(async (prisma) => {
        // Create dispatcher profile first
        const newDispatcher = await prisma.dispatcher.create({
          data: {
            name,
            phone: phone || null,
            address: address || null,
            photo: photo || null,
            isActive: isActive ?? true,
          },
        });

        // Create user account linked to dispatcher
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            photo: photo || null,
            role: 'DISPATCHER',
            dispatcherId: newDispatcher.id,
          },
        });

        // Return dispatcher with user info
        return prisma.dispatcher.findUnique({
          where: { id: newDispatcher.id },
          include: { user: true, jobs: true },
        });
      });

      let emailSent = false;
      // Send welcome email with credentials only if mailToDispatcher is true
      if (mailToDispatcher) {
        try {
          await this.mailService.sendDispatcherWelcomeEmail(
            email,
            name,
            password, // Send the plain-text password provided by admin
          );
          emailSent = true;
        } catch (error) {
          console.error('Failed to send welcome email:', error);
          // Don't fail the entire operation if email fails
        }
      }

      return {
        success: true,
        message: emailSent 
          ? 'Dispatcher created successfully and welcome email sent' 
          : 'Dispatcher created successfully',
        data: dispatcher,
      };
    } catch (error) {
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`Dispatcher with this ${field} already exists`);
      }
      throw error;
    }
  }

  async getAllDispatchers(query: any = {}) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [dispatchers, total] = await Promise.all([
      this.prisma.dispatcher.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { jobs: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispatcher.count({ where }),
    ]);

    // Calculate date ranges for statistics
    const now = new Date();
    
    // This week (Sunday to Saturday)
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go to Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Add job statistics for each dispatcher
    const dispatchersWithStats = await Promise.all(
      dispatchers.map(async (dispatcher) => {
        if (!dispatcher.user) {
          return {
            ...dispatcher,
            jobsThisWeek: 0,
            jobsThisMonth: 0,
            totalJobs: dispatcher._count.jobs,
          };
        }

        const [jobsThisWeek, jobsThisMonth] = await Promise.all([
          // Jobs created this week by this user
          this.prisma.job.count({
            where: {
              createdBy: dispatcher.user.id,
              createdAt: {
                gte: startOfWeek,
                lt: endOfWeek,
              },
            },
          }),
          // Jobs created this month by this user
          this.prisma.job.count({
            where: {
              createdBy: dispatcher.user.id,
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          }),
        ]);

        // Total jobs created by this user
        const totalJobs = await this.prisma.job.count({
          where: {
            createdBy: dispatcher.user.id,
          },
        });

        return {
          ...dispatcher,
          jobsThisWeek,
          jobsThisMonth,
          totalJobs,
        };
      }),
    );

    // Calculate overall statistics
    const [totalJobsThisWeek, totalJobsThisMonth, totalJobsOverall, activeDispatchers] = await Promise.all([
      // Total jobs created this week by all dispatchers
      this.prisma.job.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: endOfWeek,
          },
        },
      }),
      // Total jobs created this month by all dispatchers
      this.prisma.job.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      // Total jobs overall
      this.prisma.job.count(),
      // Active dispatchers count
      this.prisma.dispatcher.count({
        where: { isActive: true },
      }),
    ]);

    return {
      statistics: {
        totalDispatchers: total,
        activeNow: activeDispatchers,
        jobsThisWeek: totalJobsThisWeek,
        jobsThisMonth: totalJobsThisMonth,
        totalJobs: totalJobsOverall,
      },
      dispatchers: dispatchersWithStats,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDispatcherById(id: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        jobs: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { jobs: true } },
      },
    });

    if (!dispatcher) {
      throw new NotFoundException('Dispatcher not found');
    }

    return {
      success: true,
      message: 'Dispatcher retrieved successfully',
      data: dispatcher,
    };
  }

  async updateDispatcher(id: string, updateDto: UpdateDispatcherDto) {
    const dispatcher = await this.prisma.dispatcher.update({
      where: { id },
      data: updateDto,
      include: { user: true },
    });

    return {
      success: true,
      message: 'Dispatcher updated successfully',
      data: dispatcher,
    };
  }

  async deleteDispatcher(id: string) {
    // First, get the dispatcher to find the associated user
    const dispatcher = await this.prisma.dispatcher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!dispatcher) {
      throw new NotFoundException('Dispatcher not found');
    }

    // Delete both dispatcher and user in a transaction
    await this.prisma.$transaction(async (prisma) => {
      // Delete dispatcher first
      await prisma.dispatcher.delete({ where: { id } });

      // Delete associated user if exists
      if (dispatcher.user) {
        await prisma.user.delete({ where: { id: dispatcher.user.id } });
      }
    });

    return {
      success: true,
      message: 'Dispatcher deleted successfully',
    };
  }

  async getDispatcherStats(dispatcherId: string) {
    const stats = await this.prisma.dispatcher.findUnique({
      where: { id: dispatcherId },
      include: {
        _count: { select: { jobs: true } },
        jobs: {
          select: { status: true },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException('Dispatcher not found');
    }

    const completedJobs = stats.jobs.filter(job => job.status === 'COMPLETED').length;
    const assignedJobs = stats.jobs.filter(job => job.status === 'ASSIGNED').length;

    return {
      totalJobs: stats._count.jobs,
      completedJobs,
      assignedJobs,
      completionRate: stats._count.jobs > 0 ? (completedJobs / stats._count.jobs) * 100 : 0,
    };
  }

  async sendWelcomeEmail(dispatcherId: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({
      where: { id: dispatcherId },
      include: { user: true },
    });

    if (!dispatcher) {
      throw new NotFoundException('Dispatcher not found');
    }

    if (!dispatcher.user) {
      throw new BadRequestException('Dispatcher does not have an associated user account');
    }

    // Note: We cannot retrieve the plain-text password from the database
    // This endpoint should only be used if the password is still available
    throw new BadRequestException(
      'Cannot send welcome email: Password is already hashed and cannot be retrieved. ' +
      'Welcome emails can only be sent during dispatcher creation.'
    );
  }
}