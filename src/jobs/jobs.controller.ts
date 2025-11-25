import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { GetJobsDto } from './dto/get-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetStatsDto } from './dto/get-stats.dto';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { UserRole } from '@prisma/client';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { GetAvailableTechniciansDto } from './dto/get-available-technicians.dto';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto';

@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('add-job')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(201)
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }

  // get all job
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async getAllJobs(@Query() getJobsDto: GetJobsDto) {
    return this.jobsService.getAllJobs(getJobsDto);
  }

  @Get('single/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  // update job (status update included)
  @Patch('update/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async updateJob(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.updateJob(id, updateJobDto);
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async deleteJob(@Param('id') id: string) {
    return this.jobsService.deleteJob(id);
  }

  // job statistics
  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async getJobStats(@Query() getStatsDto: GetStatsDto) {
    return this.jobsService.getJobStats(getStatsDto);
  }

  // available technicians for a job
  @Get('available-technicians')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async getAvailableTechnicians(
    @Query() getAvailableTechniciansDto: GetAvailableTechniciansDto,
  ) {
    return this.jobsService.getAvailableTechnicians(getAvailableTechniciansDto);
  }

  @Get('available-slots')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  @HttpCode(200)
  async getAvailableSlots(@Query() getAvailableSlotsDto: GetAvailableSlotsDto) {
    return this.jobsService.getAvailableSlots(getAvailableSlotsDto);
  }
}
