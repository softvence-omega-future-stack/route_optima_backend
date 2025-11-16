import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { Response } from 'express';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN)
  async getCredentials(@Res() res: Response) {
    const result = await this.credentialsService.getCredentials();
    return res.status(HttpStatus.OK).json(result);
  }
}
