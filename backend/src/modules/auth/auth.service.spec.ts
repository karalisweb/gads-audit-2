import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { EmailOtp } from '../../entities/email-otp.entity';
import { EmailService } from '../email/email.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid-1',
    email: 'test@karalisweb.net',
    passwordHash: '$2b$12$mockhashedpassword',
    name: 'Test User',
    role: UserRole.USER,
    twoFactorEnabled: false,
    isActive: true,
    emailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    inviteToken: null,
    inviteExpiresAt: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as User;

const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
});

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof createMockRepository>;
  let refreshTokenRepo: ReturnType<typeof createMockRepository>;
  let auditLogRepo: ReturnType<typeof createMockRepository>;
  let emailOtpRepo: ReturnType<typeof createMockRepository>;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let emailService: { sendOtpEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    userRepo = createMockRepository();
    refreshTokenRepo = createMockRepository();
    auditLogRepo = createMockRepository();
    emailOtpRepo = createMockRepository();

    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.accessExpiration': '15m',
        };
        return map[key];
      }),
    };
    emailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: getRepositoryToken(EmailOtp), useValue: emailOtpRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── validateUser ─────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const hash = await bcrypt.hash('ValidPass123!', 12);
      const user = mockUser({ passwordHash: hash });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@karalisweb.net', 'ValidPass123!');

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@karalisweb.net');
    });

    it('should return null when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser('no@user.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null and increment failedLoginAttempts on wrong password', async () => {
      const hash = await bcrypt.hash('RealPassword1!', 12);
      const user = mockUser({ passwordHash: hash, failedLoginAttempts: 0 });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@karalisweb.net', 'WrongPass1!');

      expect(result).toBeNull();
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ failedLoginAttempts: 1 }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      const hash = await bcrypt.hash('RealPassword1!', 12);
      const user = mockUser({ passwordHash: hash, failedLoginAttempts: 4 });
      userRepo.findOne.mockResolvedValue(user);

      await service.validateUser('test@karalisweb.net', 'WrongPass1!');

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const user = mockUser({ lockedUntil: futureDate });
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.validateUser('test@karalisweb.net', 'AnyPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const hash = await bcrypt.hash('ValidPass123!', 12);
      const user = mockUser({ passwordHash: hash, isActive: false });
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.validateUser('test@karalisweb.net', 'ValidPass123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset failed attempts on successful login', async () => {
      const hash = await bcrypt.hash('ValidPass123!', 12);
      const user = mockUser({ passwordHash: hash, failedLoginAttempts: 3 });
      userRepo.findOne.mockResolvedValue(user);

      await service.validateUser('test@karalisweb.net', 'ValidPass123!');

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ failedLoginAttempts: 0 }),
      );
    });
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens when 2FA is disabled', async () => {
      const user = mockUser();
      refreshTokenRepo.save.mockResolvedValue({});
      auditLogRepo.create.mockReturnValue({});
      auditLogRepo.save.mockResolvedValue({});

      const result = await service.login(user, '127.0.0.1', 'test-agent');

      expect(result.requiresTwoFactor).toBe(false);
      expect(result.tokens).toBeDefined();
      expect(result.tokens!.accessToken).toBe('mock-jwt-token');
    });

    it('should require 2FA when enabled', async () => {
      const user = mockUser({ twoFactorEnabled: true });
      emailOtpRepo.count.mockResolvedValue(0);
      emailOtpRepo.save.mockResolvedValue({});

      const result = await service.login(user, '127.0.0.1', 'test-agent');

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tokens).toBeUndefined();
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
        'test@karalisweb.net',
        expect.any(String),
      );
    });

    it('should rate-limit OTP requests', async () => {
      const user = mockUser({ twoFactorEnabled: true });
      emailOtpRepo.count.mockResolvedValue(3); // Already at limit

      await expect(
        service.login(user, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── inviteUser ───────────────────────────────────────────────────────────

  describe('inviteUser', () => {
    it('should reject non-karalisweb.net domains', async () => {
      await expect(
        service.inviteUser('user@gmail.com', 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.inviteUser('test@karalisweb.net', 'admin-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invite for valid karalisweb.net email', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({});
      auditLogRepo.create.mockReturnValue({});
      auditLogRepo.save.mockResolvedValue({});

      const result = await service.inviteUser('new@karalisweb.net', 'admin-id');

      expect(result.inviteToken).toBeDefined();
      expect(result.inviteToken.length).toBe(64); // 32 bytes hex
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@karalisweb.net',
          isActive: false,
        }),
      );
    });
  });

  // ── acceptInvite ─────────────────────────────────────────────────────────

  describe('acceptInvite', () => {
    it('should throw on invalid token', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acceptInvite('bad-token', 'Password123!'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on expired token', async () => {
      const expired = new Date(Date.now() - 24 * 60 * 60 * 1000);
      userRepo.findOne.mockResolvedValue(mockUser({ inviteExpiresAt: expired }));

      await expect(
        service.acceptInvite('valid-token', 'Password123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject common passwords', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      userRepo.findOne.mockResolvedValue(
        mockUser({ inviteExpiresAt: futureDate, inviteToken: 'token' }),
      );

      await expect(
        service.acceptInvite('token', 'Password123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should throw when current password is wrong', async () => {
      const hash = await bcrypt.hash('RealPassword1!', 12);
      userRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));

      await expect(
        service.changePassword('user-uuid-1', 'WrongPassword1!', 'NewPass123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject common passwords for new password', async () => {
      const hash = await bcrypt.hash('OldPassword1!', 12);
      userRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));

      await expect(
        service.changePassword('user-uuid-1', 'OldPassword1!', 'Password123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── refreshTokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('should throw when no valid token found', async () => {
      refreshTokenRepo.find.mockResolvedValue([]);

      await expect(
        service.refreshTokens('invalid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── sanitizeUser ─────────────────────────────────────────────────────────

  describe('sanitizeUser', () => {
    it('should strip sensitive fields', () => {
      const user = mockUser();
      const sanitized = service.sanitizeUser(user);

      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized).not.toHaveProperty('inviteToken');
      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('role');
    });
  });
});
