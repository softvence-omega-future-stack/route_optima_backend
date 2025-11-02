import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { sendResponse } from 'src/lib/responseHandler';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }



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
            return sendResponse(
                HttpStatus.BAD_REQUEST,
                false,
                'user created faild',
                error,
            );
        }

    }

    @Post('login')
  @UsePipes(new ValidationPipe())
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    try {
      const result = await this.authService.login(loginDto);

      return sendResponse(HttpStatus.OK, true, 'Login successful', result);
    } catch (error) {
      return sendResponse(
        HttpStatus.UNAUTHORIZED,
        false,
        'Login failed',
        error?.message || error,
      );
    }
  }

@Post('refresh')
@HttpCode(200)
async refreshTokens(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) throw new BadRequestException('Refresh token is required');

  const result = await this.authService.refreshTokens(refreshToken);

  res.cookie('access_token', result.accessToken, { httpOnly: true });
  res.cookie('refresh_token', result.refreshToken, { httpOnly: true });

  return sendResponse(HttpStatus.OK, true, 'Tokens refreshed successfully', result);
}


}
