import { BadRequestException, Body, Controller, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { sendResponse } from 'src/lib/responseHandler';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';


@Controller('api/v1/technician')
export class TechnicianController {

  constructor(private readonly technicianService: TechnicianService) { }

  @Post('add-technician')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async addTechnician(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
  ) {
    try {
      // Parse the JSON string
      const technicianData: CreateTechnicianDto = JSON.parse(data);

      // Add the photo path if uploaded
      if (file) {
        technicianData.photo = `/uploads/${file.filename}`;
      }

      return this.technicianService.createTechnician(technicianData);
    } catch (error) {
      console.log(error)
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON data provided');
      }
      throw error;
    }
  }
}
