// src/jobs/job-completion.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobCompletionService {
  private readonly logger = new Logger(JobCompletionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompleteJobs() {
    try {
      const now = new Date();
      const currentTime = this.formatTime(now);
      const currentDate = this.formatDate(now);

      // Find assigned jobs where scheduled date is today or past AND time slot has ended
      const jobsToComplete = await this.prisma.job.findMany({
        where: {
          status: JobStatus.ASSIGNED,
          scheduledDate: {
            lte: new Date() // Jobs scheduled for today or in the past
          },
          timeSlot: {
            endTime: {
              lt: currentTime // Time slot end time is before current time
            }
          }
        },
        include: {
          timeSlot: true
        }
      });

      if (jobsToComplete.length > 0) {
        const jobIds = jobsToComplete.map(job => job.id);
        
        const result = await this.prisma.job.updateMany({
          where: {
            id: { in: jobIds }
          },
          data: {
            status: JobStatus.COMPLETED,
            updatedAt: new Date()
          }
        });

        this.logger.log(`Automatically completed ${result.count} jobs`);
        
        // Log details for debugging
        jobsToComplete.forEach(job => {
          this.logger.debug(`Job ${job.id} auto-completed. Slot: ${job.timeSlot.startTime}-${job.timeSlot.endTime}, Current: ${currentTime}`);
        });
      }
    } catch (error) {
      this.logger.error('Error in autoCompleteJobs cron job:', error);
    }
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // "HH:MM" format
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // "YYYY-MM-DD" format
  }
}