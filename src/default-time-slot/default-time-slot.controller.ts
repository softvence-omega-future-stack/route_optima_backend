import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { CreateDefaultTimeSlotDto } from './dto/create-default-time-slot.dto';
import { sendResponse } from 'src/lib/responseHandler';
import { DefaultTimeSlotService } from './default-time-slot.service';
import { Response } from 'express';

@Controller('api/v1/default-time-slot')
export class DefaultTimeSlotController {
    constructor(private readonly service: DefaultTimeSlotService) { }

    @Post('create')
    @UseGuards(AuthGuard, RolesGuard)
    @AuthRoles(UserRole.ADMIN)
    async create(
        @Body() createDto: CreateDefaultTimeSlotDto,
        @Res() res: Response,
    ) {
        try {
            const slot = await this.service.create(createDto);
            return sendResponse(
                HttpStatus.CREATED,
                true,
                'Default time slot created successfully',
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
}
