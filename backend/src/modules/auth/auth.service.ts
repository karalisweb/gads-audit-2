import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import { User, RefreshToken, AuditLog } from '../../entities';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  twoFactorAuthenticated: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly COMMON_PASSWORDS = [
    'password123!A',
    'Password123!',
    'Qwerty123456!',
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is locked. Please try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Reset failed attempts on successful validation
    if (user.failedLoginAttempts > 0) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
    }

    return user;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account after 5 failed attempts for 15 minutes
    if (failedAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await this.userRepository.update(user.id, updateData);
  }

  async login(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ tokens?: TokenPair; requiresTwoFactor: boolean; user: Partial<User> }> {
    if (user.totpEnabled) {
      // Return partial response, user needs to verify 2FA
      return {
        requiresTwoFactor: true,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    }

    const tokens = await this.generateTokens(user, true);
    await this.updateLastLogin(user.id);
    await this.logAuditEvent(user.id, 'LOGIN', 'user', user.id, ipAddress, userAgent);

    return {
      tokens,
      requiresTwoFactor: false,
      user: this.sanitizeUser(user),
    };
  }

  async verifyTwoFactor(
    userId: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ tokens: TokenPair; user: Partial<User> }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidCode = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    // Check backup codes if TOTP fails
    if (!isValidCode) {
      const isBackupCode = await this.verifyBackupCode(user, code);
      if (!isBackupCode) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const tokens = await this.generateTokens(user, true);
    await this.updateLastLogin(user.id);
    await this.logAuditEvent(user.id, 'LOGIN_2FA', 'user', user.id, ipAddress, userAgent);

    return {
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  private async verifyBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    for (let i = 0; i < user.backupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code, user.backupCodes[i]);
      if (isMatch) {
        // Remove used backup code
        const updatedCodes = [...user.backupCodes];
        updatedCodes.splice(i, 1);
        await this.userRepository.update(user.id, { backupCodes: updatedCodes });
        return true;
      }
    }

    return false;
  }

  async generateTokens(user: User, twoFactorAuthenticated: boolean): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      twoFactorAuthenticated,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.accessExpiration'),
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Calculate expiration (7 days by default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: IsNull() },
      relations: ['user'],
    });

    let validToken: RefreshToken | null = null;

    for (const token of tokens) {
      if (token.expiresAt < new Date()) continue;
      const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isMatch) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (rotation)
    await this.refreshTokenRepository.update(validToken.id, {
      revokedAt: new Date(),
    });

    // Generate new tokens
    return this.generateTokens(validToken.user, true);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, revokedAt: IsNull() },
    });

    for (const token of tokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isMatch) {
        await this.refreshTokenRepository.update(token.id, {
          revokedAt: new Date(),
        });
        break;
      }
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async inviteUser(email: string, invitedBy: string): Promise<{ inviteToken: string }> {
    // Check email domain
    if (!email.endsWith('@karalisweb.net')) {
      throw new BadRequestException('Only @karalisweb.net email addresses are allowed');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days

    await this.userRepository.save({
      email,
      inviteToken,
      inviteExpiresAt,
      isActive: false,
    });

    await this.logAuditEvent(invitedBy, 'INVITE_USER', 'user', email, null, null, { email });

    return { inviteToken };
  }

  async acceptInvite(token: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { inviteToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid invite token');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    // Validate password
    if (this.COMMON_PASSWORDS.includes(password)) {
      throw new BadRequestException('This password is too common');
    }

    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    await this.userRepository.update(user.id, {
      passwordHash,
      inviteToken: undefined,
      inviteExpiresAt: undefined,
      emailVerified: true,
      // Note: isActive stays false until 2FA is set up
    });

    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async setupTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'GAds Audit', secret);
    const qrCode = await qrcode.toDataURL(otpAuthUrl);

    // Store secret temporarily (will be confirmed when user verifies)
    await this.userRepository.update(userId, { totpSecret: secret });

    return { secret, qrCode };
  }

  async enableTwoFactor(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.totpSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Generate backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const backupCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(backupCode);
      hashedBackupCodes.push(await bcrypt.hash(backupCode, 10));
    }

    await this.userRepository.update(userId, {
      totpEnabled: true,
      backupCodes: hashedBackupCodes,
      isActive: true, // Activate user after 2FA setup
    });

    return { backupCodes };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (this.COMMON_PASSWORDS.includes(newPassword)) {
      throw new BadRequestException('This password is too common');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.userRepository.update(userId, { passwordHash });

    // Revoke all refresh tokens
    await this.logoutAll(userId);
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  private sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      totpEnabled: user.totpEnabled,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    ipAddress: string | null,
    userAgent: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      entityType,
      entityId,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      metadata,
    });
    await this.auditLogRepository.save(auditLog);
  }
}
