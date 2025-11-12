import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { GetJobsDto } from './dto/get-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetStatsDto } from './dto/get-stats.dto';

@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('add-job')
  @HttpCode(201)
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }

  // get all job
  @Get()
  @HttpCode(200)
  async getAllJobs(@Query() getJobsDto: GetJobsDto) {
    return this.jobsService.getAllJobs(getJobsDto);
  }

  @Get('single/:id')
  @HttpCode(200)
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  // update job (status update included)
  @Patch('update/:id')
  @HttpCode(200)
  async updateJob(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.updateJob(id, updateJobDto);
  }

  // job statistics
  @Get('stats')
  @HttpCode(200)
  async getJobStats(@Query() getStatsDto: GetStatsDto) {
    return this.jobsService.getJobStats(getStatsDto);
  }
}
