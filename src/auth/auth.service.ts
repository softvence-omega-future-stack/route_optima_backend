import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { MailService } from 'src/mail/mail.service';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, name, photo } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        photo: photo || null,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photo: user.photo
      },
    };
  }

  async login(loginData: LoginDto, userAgent?: string, req?: any) {
    const { email, password } = loginData;

    if (!email) throw new BadRequestException('Email must be provided');

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.excludePassword(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async getCurrentAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('Admin not found');
    if (user.role !== 'ADMIN')
      throw new UnauthorizedException('Access denied: not an admin');

    return this.excludePassword(user);
  }

  // * refresh token
  async refreshTokens(refreshToken: string) {
    try {
      this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
      });

      const session = await this.prisma.session.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session || !session.user)
        throw new UnauthorizedException('Invalid refresh token');

      const tokens = await this.generateTokens(
        session.user.id,
        session.user.email,
        session.user.role,
      );

      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logoutBySessionId(sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.isActive) {
      throw new BadRequestException('Invalid or inactive session');
    }

    // Deactivate session
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false, refreshToken: '' },
    });

    return true;
  }

  async logoutByToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const session = await this.prisma.session.findFirst({
      where: { refreshToken, isActive: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already inactive');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isActive: false, refreshToken: null },
    });

    return true;
  }

  // --- REQUEST RESET LINK ---
  async requestPasswordReset(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new BadRequestException('No account found with this email address');
      }

      const token = randomBytes(32).toString('hex');

      await this.prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: addMinutes(new Date(), 15), // expires in 15 minutes
        },
      });

      // send email
      await this.mailService.sendPasswordResetMail(user.email, token);

      return { message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);

      // Check for known NestJS error types or Prisma errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Fallback: wrap unknown errors in an HTTP exception
      throw new BadRequestException(
        error.message || 'Failed to process password reset request',
      );
    }
  }

  // --- VERIFY & RESET PASSWORD ---
  async resetPassword(token: string, newPassword: string) {
    try {
      //  Find token and associated user
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      // Validate token
      if (!resetToken) throw new BadRequestException('Invalid or missing token');
      if (resetToken.used) throw new BadRequestException('Token has already been used');
      if (resetToken.expiresAt < new Date()) throw new BadRequestException('Token has expired');

      // Hash new password
      const hashed = await bcrypt.hash(newPassword, 12);

      // Perform updates in a transaction
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashed },
        }),
        this.prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ]);

      // Return success
      return { message: 'Password reset successful' };
    } catch (error) {
      console.error('Error in resetPassword:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Fallback: wrap other errors
      throw new BadRequestException(error.message || 'Failed to reset password');
    }
  }

  // * generate token
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { id: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'default-access-secret-key',
      expiresIn: '60m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  // * create session
  private async createSession(userId: string, refreshToken: string) {
    // Deactivate any old sessions for this user
    await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.session.create({
      data: {
        id: uuid(),
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  }
  // * utils
  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...result } = user;
    return result;
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.excludePassword(user);
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'default-access-secret-key',
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
