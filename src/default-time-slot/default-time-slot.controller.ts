import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { CreateDefaultTimeSlotDto } from './dto/create-default-time-slot.dto';
import { sendResponse } from 'src/lib/responseHandler';
import { DefaultTimeSlotService } from './default-time-slot.service';
import { Response } from 'express';
import { UpdateDefaultTimeSlotDto } from './dto/update-default-time-slot.dto';

@Controller('api/v1/default-time-slot')
export class DefaultTimeSlotController {
  constructor(private readonly service: DefaultTimeSlotService) {}

  @Post('create')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER, UserRole.ADMIN)
  async create(
    @Body() createDto: CreateDefaultTimeSlotDto,
    @Res() res: Response,
  ) {
    try {
      const slot = await this.service.create(createDto);
      return sendResponse(
        HttpStatus.CREATED,
        true,
        'Time slot created successfully',
        slot,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        error.message || 'Failed to create default time slot',
        null,
        null,
        res,
      );
    }
  }

  @Patch('update/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER,UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDefaultTimeSlotDto,
    @Res() res: Response,
  ) {
    try {
      const slot = await this.service.update(id, updateDto);
      return sendResponse(
        HttpStatus.OK,
        true,
        'Time slot updated successfully',
        slot,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        error.message || 'Failed to update time slot',
        null,
        null,
        res,
      );
    }
  }

  @Get('all')
    @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER,UserRole.ADMIN)
  async findAll(@Res() res: Response) {
    try {
      const slots = await this.service.findAll();
      return sendResponse(
        HttpStatus.OK,
        true,
        'Time slots retrieved successfully',
        slots,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        error.message || 'Failed to retrieve time slots',
        null,
        null,
        res,
      );
    }
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER,UserRole.ADMIN)
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.service.remove(id);
      return sendResponse(HttpStatus.OK, true, result.message, null, null, res);
    } catch (error) {
      return sendResponse(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        error.message || 'Failed to delete time slot',
        null,
        null,
        res,
      );
    }
  }
}
