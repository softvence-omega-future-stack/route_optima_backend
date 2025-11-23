import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { sendResponse } from 'src/lib/responseHandler';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetAllTechniciansDto } from './dto/get-all-technicians-dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';

@Controller('api/v1/technician')
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  @Post('add-technician')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async addTechnician(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
  ) {
    try {
      console.log(file);
      // Parse the JSON string
      const technicianData: CreateTechnicianDto = JSON.parse(data);

      // Add the photo path if uploaded
      if (file) {
        technicianData.photo = `${file.path}`;
      }
      // console.log(technicianData)
      return this.technicianService.createTechnician(technicianData);
    } catch (error) {
      // console.log(error);
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON data provided');
      }
      throw error;
    }
  }

  @Get('all-technicians')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getAllTechnicians(
    @Query() query: GetAllTechniciansDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.technicianService.getAllTechnicians(query);

      return sendResponse(
        HttpStatus.OK,
        true,
        'Technicians retrieved successfully',
        result.technicians,
        result.meta,
        res,
      );
    } catch (error) {
      console.error('Error in getAllTechnicians:', error);

      if (error instanceof BadRequestException) {
        return sendResponse(HttpStatus.BAD_REQUEST, false, error.message);
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to retrieve technicians',
        null,
        null,
        res,
      );
    }
  }

  @Get('single/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getTechnicianById(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.technicianService.getTechnicianById(id);

      return sendResponse(
        HttpStatus.OK,
        result.success,
        result.message,
        result.data, // Changed from result.technician to result.data
        null,
        res,
      );
    } catch (error) {
      console.error('Error in getTechnicianById:', error);

      if (error instanceof BadRequestException) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          error.message,
          null,
          null,
          res,
        );
      }

      if (error.status === 404 || error.message.includes('not found')) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          error.message || 'Technician not found',
          null,
          null,
          res,
        );
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to retrieve technician',
        null,
        null,
        res,
      );
    }
  }

  @Get('single/details/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getTechnicianDetailsById(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.technicianService.getTechnicianDetailsById(id);

      return sendResponse(
        HttpStatus.OK,
        result.success,
        result.message,
        result.data, // Changed from result.technician to result.data
        null,
        res,
      );
    } catch (error) {
      console.error('Error in getTechnicianById:', error);

      if (error instanceof BadRequestException) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          error.message,
          null,
          null,
          res,
        );
      }

      if (error.status === 404 || error.message.includes('not found')) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          error.message || 'Technician not found',
          null,
          null,
          res,
        );
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to retrieve technician',
        null,
        null,
        res,
      );
    }
  }

  @Patch('update-technician/:id')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async updateTechnician(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
    @Res() res: Response,
  ) {
    try {
      // Parse the JSON string
      const technicianData: UpdateTechnicianDto = data ? JSON.parse(data) : {};

      // Add the photo path if uploaded
      if (file) {
        technicianData.photo = `/uploads/${file.filename}`;
      }

      const result = await this.technicianService.updateTechnician(
        id,
        technicianData,
      );

      return sendResponse(
        HttpStatus.OK,
        true,
        result.message,
        result.technician,
        null,
        res,
      );
    } catch (error) {
      console.error('Error in updateTechnician:', error);

      if (error instanceof SyntaxError) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Invalid JSON data provided',
          null,
          null,
          res,
        );
      }

      if (error instanceof BadRequestException) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          error.message,
          null,
          null,
          res,
        );
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to update technician',
        null,
        null,
        res,
      );
    }
  }

  @Delete('delete-technician/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async deleteTechnician(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.technicianService.deleteTechnician(id);

      return sendResponse(HttpStatus.OK, true, result.message, null, null, res);
    } catch (error) {
      console.error('Error in deleteTechnician:', error);

      if (error instanceof BadRequestException) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          error.message,
          null,
          null,
          res,
        );
      }

      if (error.status === 404 || error.message.includes('not found')) {
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          error.message || 'Technician not found',
          null,
          null,
          res,
        );
      }

      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to delete technician',
        null,
        null,
        res,
      );
    }
  }

  
}
