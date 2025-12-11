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
  UseInterceptors,
  UploadedFile,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

@Controller('api/v1/dispatcher')
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Post('create')
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
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
    @Res() res: Response,
  ) {
    try {
      // Parse the JSON string
      const dispatcherData: CreateDispatcherDto = JSON.parse(data);

      // Add the photo path if uploaded
      if (file) {
        dispatcherData.photo = `/uploads/${file.filename}`;
      }

      // Extract mailToDispatcher from parsed data (not part of DTO)
      const mailToDispatcher = (dispatcherData as any).mailToDispatcher === true;
      
      const result = await this.dispatcherService.createDispatcher(dispatcherData, mailToDispatcher);
      return sendResponse(
        HttpStatus.CREATED,
        true,
        result.message,
        result.data,
        null,
        res,
      );
    } catch (error) {
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
  @AuthRoles(UserRole.ADMIN, UserRole.DISPATCHER)
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
  @AuthRoles(UserRole.ADMIN, UserRole.DISPATCHER)
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
    @Res() res: Response,
  ) {
    try {
      // Parse the JSON string
      const dispatcherData: UpdateDispatcherDto = data ? JSON.parse(data) : {};

      // Add the photo path if uploaded
      if (file) {
        dispatcherData.photo = `/uploads/${file.filename}`;
      }

      // Explicitly remove email and password if somehow included
      delete (dispatcherData as any).email;
      delete (dispatcherData as any).password;

      const result = await this.dispatcherService.updateDispatcher(id, dispatcherData);
      return sendResponse(
        HttpStatus.OK,
        true,
        result.message,
        result.data,
        null,
        res,
      );
    } catch (error) {
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