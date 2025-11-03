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
  constructor(private readonly authService: AuthService) { }

@Post('register')
@UsePipes(new ValidationPipe())
async register(@Body() userRegistrationData: RegisterDto, @Res() res: Response) {
  try {
    const { user } = await this.authService.register(userRegistrationData);
    return res
      .status(HttpStatus.CREATED)
      .json(sendResponse(HttpStatus.CREATED, true, 'User created successfully', user));
  } catch (error) {
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

    res.cookie('access_token', loginResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 minutes
    });

    res.cookie('refresh_token', loginResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      message: 'Logged in successfully',
      token: {
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Login failed',
      error: error.message || error
    };
  }
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


  @Post('logout')
  @HttpCode(200)
  async logoutByToken(@Req() req, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        return sendResponse(HttpStatus.BAD_REQUEST, false, 'No refresh token found');
      }

      // Call service to remove token from DB
      await this.authService.logoutByToken(refreshToken);

      // Clear cookies
      res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict', secure: true });
      res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict', secure: true });

      return sendResponse(HttpStatus.OK, true, 'Logged out successfully');
    } catch (error) {
      return sendResponse(HttpStatus.BAD_REQUEST, false, 'Logout failed', error);
    }
  }









}
