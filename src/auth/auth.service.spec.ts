import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: 'DISPATCHER',
      dispatcher: {
        id: 'dispatcher-id',
        isActive: true, // Default active
      },
    };

    it('should throw UnauthorizedException if dispatcher is inactive', async () => {
      // Mock user finding
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        dispatcher: {
          ...mockUser.dispatcher,
          isActive: false, // Inactive dispatcher
        },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Your account is inactive. Please contact support.');
    });

    it('should allow login if dispatcher is active', async () => {
      // Mock bcrypt
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findMany.mockResolvedValue([]); // No active sessions
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should allow login if user is not a dispatcher (e.g. ADMIN)', async () => {
       // Mock bcrypt
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      const adminUser = {
        ...mockUser,
        role: 'ADMIN',
        dispatcher: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.session.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
    });
  });
});
