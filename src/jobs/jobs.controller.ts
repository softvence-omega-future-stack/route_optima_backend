import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResponseDto } from './dto/job-response.dto';

@Controller('api/v1/jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) {}

  @Post('add-job')
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Body() createJobDto: CreateJobDto): Promise<JobResponseDto> {
    return this.jobsService.createJob(createJobDto);
  }
}
