import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, RefreshToken, AuditLog, EmailOtp } from '../../entities';
import { EmailService } from '../email/email.service';

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
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly OTP_EXPIRATION_MINUTES = 10;
  private readonly OTP_RATE_LIMIT_MINUTES = 15;
  private readonly OTP_RATE_LIMIT_MAX = 3;
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
    @InjectRepository(EmailOtp)
    private readonly emailOtpRepository: Repository<EmailOtp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account bloccato. Riprova più tardi.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account non attivo');
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

  private generateOtpCode(): string {
    // Generate a cryptographically secure 6-digit code
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);
    const code = (num % 900000 + 100000).toString();
    return code;
  }

  private async checkOtpRateLimit(email: string, type: 'login' | 'password_reset'): Promise<void> {
    const rateLimitStart = new Date(Date.now() - this.OTP_RATE_LIMIT_MINUTES * 60 * 1000);

    const recentOtps = await this.emailOtpRepository.count({
      where: {
        email,
        type,
        createdAt: MoreThan(rateLimitStart),
      },
    });

    if (recentOtps >= this.OTP_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        `Hai raggiunto il limite massimo di richieste. Riprova tra ${this.OTP_RATE_LIMIT_MINUTES} minuti.`
      );
    }
  }

  async login(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ tokens?: TokenPair; requiresTwoFactor: boolean; user: Partial<User> }> {
    if (user.twoFactorEnabled) {
      // Check rate limit
      await this.checkOtpRateLimit(user.email, 'login');

      // Generate and send OTP
      const code = this.generateOtpCode();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MINUTES * 60 * 1000);

      await this.emailOtpRepository.save({
        email: user.email,
        codeHash,
        expiresAt,
        type: 'login',
      });

      // Send email
      await this.emailService.sendOtpEmail(user.email, code);

      this.logger.log(`OTP sent for login to ${user.email}`);

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
      throw new NotFoundException('Utente non trovato');
    }

    // Find valid OTP
    const validOtp = await this.emailOtpRepository.findOne({
      where: {
        email: user.email,
        type: 'login',
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!validOtp) {
      throw new UnauthorizedException('Codice OTP scaduto o non valido');
    }

    const isValidCode = await bcrypt.compare(code, validOtp.codeHash);

    if (!isValidCode) {
      throw new UnauthorizedException('Codice OTP non valido');
    }

    // Mark OTP as used
    await this.emailOtpRepository.update(validOtp.id, {
      used: true,
      usedAt: new Date(),
    });

    const tokens = await this.generateTokens(user, true);
    await this.updateLastLogin(user.id);
    await this.logAuditEvent(user.id, 'LOGIN_2FA', 'user', user.id, ipAddress, userAgent);

    return {
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    // Don't reveal if user exists
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Check rate limit
    await this.checkOtpRateLimit(email, 'password_reset');

    // Generate and send OTP
    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MINUTES * 60 * 1000);

    await this.emailOtpRepository.save({
      email,
      codeHash,
      expiresAt,
      type: 'password_reset',
    });

    await this.emailService.sendPasswordResetEmail(email, code);
    this.logger.log(`Password reset OTP sent to ${email}`);
  }

  async verifyPasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Codice non valido o scaduto');
    }

    // Find valid OTP
    const validOtp = await this.emailOtpRepository.findOne({
      where: {
        email,
        type: 'password_reset',
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!validOtp) {
      throw new BadRequestException('Codice non valido o scaduto');
    }

    const isValidCode = await bcrypt.compare(code, validOtp.codeHash);

    if (!isValidCode) {
      throw new BadRequestException('Codice non valido');
    }

    // Validate password
    if (this.COMMON_PASSWORDS.includes(newPassword)) {
      throw new BadRequestException('Questa password è troppo comune');
    }

    // Mark OTP as used
    await this.emailOtpRepository.update(validOtp.id, {
      used: true,
      usedAt: new Date(),
    });

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.userRepository.update(user.id, { passwordHash });

    // Revoke all refresh tokens
    await this.logoutAll(user.id);

    this.logger.log(`Password reset completed for ${email}`);
  }

  async toggle2FA(userId: string, enabled: boolean): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    await this.userRepository.update(userId, { twoFactorEnabled: enabled });
    this.logger.log(`2FA ${enabled ? 'enabled' : 'disabled'} for user ${user.email}`);
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
      throw new UnauthorizedException('Token di refresh non valido');
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
      throw new BadRequestException('Sono ammessi solo indirizzi email @karalisweb.net');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Esiste già un utente con questa email');
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
      throw new NotFoundException('Token di invito non valido');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Il token di invito è scaduto');
    }

    // Validate password
    if (this.COMMON_PASSWORDS.includes(password)) {
      throw new BadRequestException('Questa password è troppo comune');
    }

    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    await this.userRepository.update(user.id, {
      passwordHash,
      inviteToken: undefined,
      inviteExpiresAt: undefined,
      emailVerified: true,
      isActive: true, // User is active immediately
      twoFactorEnabled: true, // 2FA enabled by default
    });

    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!updatedUser) {
      throw new NotFoundException('Utente non trovato');
    }
    return updatedUser;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('La password attuale non è corretta');
    }

    if (this.COMMON_PASSWORDS.includes(newPassword)) {
      throw new BadRequestException('Questa password è troppo comune');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.userRepository.update(userId, { passwordHash });

    // Revoke all refresh tokens
    await this.logoutAll(userId);
  }

  async updateProfile(userId: string, name: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    await this.userRepository.update(userId, { name });

    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!updatedUser) {
      throw new NotFoundException('Utente non trovato');
    }
    return updatedUser;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
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
