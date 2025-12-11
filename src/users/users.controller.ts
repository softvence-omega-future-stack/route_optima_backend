import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { sendResponse } from 'src/lib/responseHandler';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { UserRole } from '@prisma/client';
import { AuthRoles } from 'src/common/decorators/roles.decorator';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN, UserRole.DISPATCHER)
  async findAll() {
    try {
      const result = await this.usersService.findAll();
      return sendResponse(
        HttpStatus.OK,
        true,
        'Users fetched successfully',
        result.data,
      );
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        'Failed to fetch users',
        error,
      );
    }
  }
}
