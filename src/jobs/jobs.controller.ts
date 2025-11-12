import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { GetJobsDto } from './dto/get-jobs.dto';



@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('add-job')
  @HttpCode(201)
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  @HttpCode(200)
  async getAllJobs(@Query() getJobsDto: GetJobsDto) {
    return this.jobsService.getAllJobs(getJobsDto);
  }
}
