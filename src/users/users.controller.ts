import { Controller, Get, HttpStatus } from '@nestjs/common';
import { sendResponse } from 'src/lib/responseHandler';
import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    try {
      const result = await this.usersService.findAll();
      return sendResponse(HttpStatus.OK, true, 'Users fetched successfully', result.data);
    } catch (error) {
      return sendResponse(HttpStatus.BAD_REQUEST, false, 'Failed to fetch users', error);
    }
  }
}
