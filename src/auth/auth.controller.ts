import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { sendResponse } from 'src/lib/responseHandler';
import { LoginDto } from './dto/login.dto';
import type { CustomCookiesResponse } from 'src/common/types/cookiesResponse.types';
import { AuthGuard } from './guards/jwt-auth-guard';
import { RolesGuard } from './guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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
  @UsePipes(new ValidationPipe())
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') data: string,
    @Res() res: Response,
  ) {
    try {
      // Parse the JSON string
      const userRegistrationData: RegisterDto = JSON.parse(data);

      // Add the photo path if uploaded
      if (file) {
        userRegistrationData.photo = `/uploads/${file.filename}`;
      }

      const { user } = await this.authService.register(userRegistrationData);
      return res
        .status(HttpStatus.CREATED)
        .json(
          sendResponse(
            HttpStatus.CREATED,
            true,
            'User created successfully',
            user,
          ),
        );
    } catch (error) {
      if (error instanceof SyntaxError) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json(
            sendResponse(
              HttpStatus.BAD_REQUEST,
              false,
              'Invalid JSON data provided',
              null,
            ),
          );
      }
      const status = error.status || error.statusCode || HttpStatus.BAD_REQUEST;
      return res
        .status(status)
        .json(sendResponse(status, false, 'User creation failed', error));
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: CustomCookiesResponse,
  ) {
    try {
      const loginResult = await this.authService.login(loginDto);

      // res.cookie('access_token', loginResult.accessToken, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: 'strict',
      //   maxAge: 1000 * 60 * 15,
      // });

      // res.cookie('refresh_token', loginResult.refreshToken, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: 'strict',
      //   maxAge: 1000 * 60 * 60 * 24 * 7,
      // });

      return {
        success: true,
        message: 'Logged in successfully',
        token: {
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        error: error.message || error,
      };
    }
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN, UserRole.DISPATCHER)
  async getCurrentUser(@CurrentUser() user) {
    try {
      if (!user || !user.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      const data = await this.authService.getCurrentUser(user.id);

      return sendResponse(
        HttpStatus.OK,
        true,
        'Current user fetched successfully',
        data,
      );
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return sendResponse(
        status,
        false,
        'Failed to get current user',
        error.message || error,
      );
    }
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    const { accessToken } = await this.authService.refreshTokens(refreshToken);

    return {
      message: 'Token refreshed successfully',
      accessToken,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      if (!refreshToken) {
        return sendResponse(
          HttpStatus.BAD_REQUEST,
          false,
          'Refresh token is required',
        );
      }

      // Call service to remove token from DB
      await this.authService.logoutByToken(refreshToken);

      // Clear cookies
      res.clearCookie('access_token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      });
      res.clearCookie('refresh_token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      });

      return sendResponse(HttpStatus.OK, true, 'Logged out successfully');
    } catch (error) {
      return sendResponse(
        HttpStatus.BAD_REQUEST,
        false,
        'Logout failed',
        error.message || error,
      );
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    try {
      const result = await this.authService.requestPasswordReset(email);
      return sendResponse(HttpStatus.OK, true, result.message);
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return sendResponse(
        status,
        false,
        'Password reset request failed',
        error.message || error,
      );
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    try {
      const result = await this.authService.resetPassword(token, newPassword);
      return sendResponse(HttpStatus.OK, true, result.message);
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return sendResponse(
        status,
        false,
        'Password reset failed',
        error.message || error,
      );
    }
  }

  @Post('verify-token')
  @HttpCode(200)
  async verifyToken(@Body('token') token: string) {
    try {
      const payload = await this.authService.verifyToken(token);
      return sendResponse(HttpStatus.OK, true, 'Token is valid', payload);
    } catch (error) {
      const status = error.status || HttpStatus.UNAUTHORIZED;
      return sendResponse(
        status,
        false,
        'Token verification failed',
        error.message || error,
      );
    }
  }
}
