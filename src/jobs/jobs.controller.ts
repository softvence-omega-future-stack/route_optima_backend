import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';



@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('add-job')
  @HttpCode(201)
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }
}
