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
import { JwtPayload } from 'src/common/types/cookiesResponse.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, photo, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with dispatcher profile if role is DISPATCHER
    const userData = {
      email,
      password: hashedPassword,
      name,
      role: role || 'DISPATCHER',
      photo: photo || null,
    };

    let user;
    if (role === 'DISPATCHER') {
      user = await this.prisma.user.create({
        data: {
          ...userData,
          dispatcher: {
            create: {
              name: name || 'Dispatcher',
              phone: null,
              address: null,
              photo: photo || null,
            },
          },
        },
        include: { dispatcher: true },
      });
    } else {
      user = await this.prisma.user.create({ data: userData });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photo: user.photo,
      },
    };
  }

  async login(loginData: LoginDto) {
    const { email, password } = loginData;

    if (!email) throw new BadRequestException('Email must be provided');

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { dispatcher: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Check if dispatcher is inactive
    if (user.role === 'DISPATCHER' && user.dispatcher && !user.dispatcher.isActive) {
      throw new UnauthorizedException(
        'Your account is inactive. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    // Clean up ONLY expired sessions, keep active ones
    await this.cleanupExpiredSessionsOnly(user.id);

    // Check session limit (allow max 100 simultaneous sessions)
    await this.enforceSessionLimit(user.id, 100);

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.dispatcher?.id,
    );
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.excludePassword(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Allow ADMIN or DISPATCHER
    if (user.role !== 'ADMIN' && user.role !== 'DISPATCHER') {
      throw new UnauthorizedException(
        'Access denied: only admin or dispatcher can access this resource',
      );
    }

    return this.excludePassword(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token validity
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          '1e7449b52f6582bc87373bf6ed8d50b58e5a59',
      });

      // Find the session
      const session = await this.prisma.session.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session || !session.user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token payload
      const accessTokenPayload = {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };

      const accessToken = await this.jwtService.signAsync(
        accessTokenPayload as any,
        {
          secret:
            process.env.JWT_SECRET || '1e7449b52f6582bc87373bf6ed8db58e5a59',
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        } as any,
      );

      // Update session last activity (optional)
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          updatedAt: new Date(),
        },
      });

      return {
        accessToken,
        refreshToken, // Return the same refresh token
      };
    } catch (error) {
      // Auto-cleanup invalid refresh tokens
      await this.cleanupInvalidRefreshToken(refreshToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  //  Cleanup specific invalid refresh token
  private async cleanupInvalidRefreshToken(
    refreshToken: string,
  ): Promise<void> {
    try {
      await this.prisma.session.deleteMany({
        where: {
          refreshToken,
          OR: [{ isActive: false }, { expiresAt: { lt: new Date() } }],
        },
      });
    } catch (error) {
      // Silent fail - this is just cleanup
    }
  }

  // Logout with immediate cleanup
  async logoutByToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      // Delete the session directly (more efficient than find + delete)
      const result = await this.prisma.session.deleteMany({
        where: {
          refreshToken,
          isActive: true,
        },
      });

      // If no session was found, it might already be cleaned up
      // if (result.count === 0) {
      //   console.log('Session already deleted or not found');
      // }

      return true;
    } catch (error) {
      // If session not found, consider it successful logout
      if (
        error.code === 'P2025' ||
        error.message?.includes('Record to delete does not exist')
      ) {
        return true;
      }
      throw error;
    }
  }

  // Create session with built-in limits
  private async createSession(userId: string, refreshToken: string) {
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

  // --- REQUEST RESET LINK ---
  async requestPasswordReset(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new BadRequestException(
          'No account found with this email address',
        );
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

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message || 'Failed to process password reset request',
      );
    }
  }

  // --- VERIFY & RESET PASSWORD ---
  async resetPassword(token: string, newPassword: string) {
    try {
      // Find token and associated user
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      // Validate token
      if (!resetToken)
        throw new BadRequestException('Invalid or missing token');
      if (resetToken.used)
        throw new BadRequestException('Token has already been used');
      if (resetToken.expiresAt < new Date())
        throw new BadRequestException('Token has expired');

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

      return { message: 'Password reset successful' };
    } catch (error) {
      console.error('Error in resetPassword:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message || 'Failed to reset password',
      );
    }
  }

  // * generate token
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    dispatcherId?: string,
  ) {
    const payload: any = {
      sub: userId, // Use 'sub' instead of 'id'
      email,
      role,
    };

    if (dispatcherId) {
      payload.dispatcherId = dispatcherId;
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || '1e7449b52f6582bc87373bf6ed8db58e5a59',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    } as any);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ||
        '1e7449b52f6582b7373bf6ed8d50b58e5a59',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as any);

    return { accessToken, refreshToken };
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

      // Return the payload with id mapped from sub
      return {
        id: payload.sub, // Map sub back to id for your application
        email: payload.email,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Enforce maximum session limit per user
  private async enforceSessionLimit(
    userId: string,
    maxSessions: number = 100,
  ): Promise<void> {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    // If over limit, remove oldest sessions
    if (activeSessions.length >= maxSessions) {
      const sessionsToDelete = activeSessions.slice(
        0,
        activeSessions.length - maxSessions + 1,
      );

      await this.prisma.session.deleteMany({
        where: {
          id: { in: sessionsToDelete.map((s) => s.id) },
        },
      });
    }
  }

  // Clean up ONLY expired sessions (keep active ones) - ADD THIS METHOD
  private async cleanupExpiredSessionsOnly(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() }, // Only delete expired, keep active
      },
    });
  }
}
