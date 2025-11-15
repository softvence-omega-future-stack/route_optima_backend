import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { Response } from 'express';

@Controller('api/v1/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  async getCredentials(@Res() res: Response) {
    const result = await this.credentialsService.getCredentials();
    return res.status(HttpStatus.OK).json(result);
  }
}