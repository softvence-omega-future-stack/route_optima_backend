import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { sendResponse } from 'src/lib/responseHandler';
import { LoginDto } from './dto/login.dto';
import type { CustomCookiesResponse } from 'src/common/types/cookiesResponse.types';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe())
  async register(@Body() userRegistrationData: RegisterDto) {
    try {
      const { user } = await this.authService.register(userRegistrationData);
      return sendResponse(
        HttpStatus.OK,
        true,
        'User created successfully ',
        user,
      );
    } catch (error) {
      return sendResponse(HttpStatus.BAD_REQUEST, false, 'user created faild', error);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: CustomCookiesResponse,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.login(loginDto);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true, // set to true in production with HTTPS
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return { message: 'Logged in successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshTokens(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens(refreshToken);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { message: 'Token refreshed' };
  }

@Post('logout-session')
@HttpCode(200)
async logout(
  @Body('sessionId') sessionId: string,
  @Res({ passthrough: true }) res: Response,
) {
  try {
    // Call service
    await this.authService.logoutBySessionId(sessionId);

    // Clear cookies
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict' });
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });

    return sendResponse(HttpStatus.OK, true, 'Logged out successfully');
  } catch (error) {
    return sendResponse(HttpStatus.BAD_REQUEST, false, 'Logout failed', error);
  }
}







  
}
