import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { sendResponse } from 'src/lib/responseHandler';
import type { Response } from 'express';


@Controller('api/v1/technician')
export class TechnicianController {

  constructor(private readonly technicianService: TechnicianService) { }

  @Post('add-technician')
  async create(@Body() dto: CreateTechnicianDto, @Res() res?: Response) {
    try {
      const result = await this.technicianService.createTechnician(dto);

      return sendResponse(
        HttpStatus.CREATED,
        true,
        'Technician created successfully',
        result,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        error.message || 'Failed to create technician',
        null,
        null,
        res,
      );
    }
  }
}
