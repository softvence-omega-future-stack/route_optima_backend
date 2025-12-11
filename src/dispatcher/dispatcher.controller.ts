import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { DispatcherService } from './dispatcher.service';
import { CreateDispatcherDto } from './dto/create-dispatcher.dto';
import { UpdateDispatcherDto } from './dto/update-dispatcher.dto';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { sendResponse } from 'src/lib/responseHandler';
import { Response } from 'express';

@Controller('api/v1/dispatcher')
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Post('create')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async create(@Body() createDto: CreateDispatcherDto, @Res() res: Response) {
    try {
      // Extract mailToDispatcher from body (not part of DTO)
      const mailToDispatcher = (createDto as any).mailToDispatcher === true;
      
      const result = await this.dispatcherService.createDispatcher(createDto, mailToDispatcher);
      return sendResponse(
        HttpStatus.CREATED,
        true,
        result.message,
        result.data,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }

  @Get('all')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getAllDispatchers(@Query() query: any, @Res() res: Response) {
    try {
      const result = await this.dispatcherService.getAllDispatchers(query);
      return sendResponse(
        HttpStatus.OK,
        true,
        'Dispatchers retrieved successfully',
        result.dispatchers,
        {
          statistics: result.statistics,
          ...result.meta,
        },
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getDispatcherById(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.dispatcherService.getDispatcherById(id);
      return sendResponse(
        HttpStatus.OK,
        result.success,
        result.message,
        result.data,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.NOT_FOUND,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }

  @Patch('update/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async updateDispatcher(
    @Param('id') id: string,
    @Body() updateDto: UpdateDispatcherDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.dispatcherService.updateDispatcher(id, updateDto);
      return sendResponse(
        HttpStatus.OK,
        result.success,
        result.message,
        result.data,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async deleteDispatcher(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.dispatcherService.deleteDispatcher(id);
      return sendResponse(
        HttpStatus.OK,
        result.success,
        result.message,
        null,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }

  @Get('stats/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getDispatcherStats(@Param('id') id: string, @Res() res: Response) {
    try {
      const stats = await this.dispatcherService.getDispatcherStats(id);
      return sendResponse(
        HttpStatus.OK,
        true,
        'Dispatcher stats retrieved successfully',
        stats,
        null,
        res,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.NOT_FOUND,
        false,
        error.message,
        null,
        null,
        res,
      );
    }
  }
}