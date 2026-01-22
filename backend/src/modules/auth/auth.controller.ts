import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { UserRole, User } from '../../entities/user.entity';
import {
  VerifyTwoFactorDto,
  AcceptInviteDto,
  InviteUserDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
  Toggle2FADto,
  UpdateProfileDto,
} from './dto';

interface RequestWithUser extends Request {
  user: User & { twoFactorAuthenticated?: boolean };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: RequestWithUser) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(req.user, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.verifyTwoFactor(
      dto.userId,
      dto.code,
      ipAddress,
      userAgent,
    );
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'Se l\'email esiste, riceverai un codice di verifica' };
  }

  @Public()
  @Post('verify-password-reset')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordReset(@Body() dto: VerifyPasswordResetDto) {
    await this.authService.verifyPasswordReset(dto.email, dto.code, dto.newPassword);
    return { message: 'Password reimpostata con successo' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    await this.authService.logout(userId, refreshToken);
    return { message: 'Logout effettuato con successo' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId);
    return { message: 'Logout effettuato da tutti i dispositivi' };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('invite')
  async invite(
    @Body() dto: InviteUserDto,
    @CurrentUser('id') invitedBy: string,
  ) {
    const result = await this.authService.inviteUser(dto.email, invitedBy);
    // In production, send email instead of returning token
    return {
      message: 'Invito inviato con successo',
      // Only return token in development
      ...(process.env.NODE_ENV === 'development' && { inviteToken: result.inviteToken }),
    };
  }

  @Public()
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const user = await this.authService.acceptInvite(dto.token, dto.password);
    return {
      message: 'Account creato con successo',
      userId: user.id,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return { message: 'Password aggiornata con successo' };
  }

  @Patch('2fa')
  @HttpCode(HttpStatus.OK)
  async toggle2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: Toggle2FADto,
  ) {
    await this.authService.toggle2FA(userId, dto.enabled);
    return {
      message: dto.enabled ? '2FA attivata con successo' : '2FA disattivata con successo',
      twoFactorEnabled: dto.enabled,
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.updateProfile(userId, dto.name || '');
    return {
      message: 'Profilo aggiornato con successo',
      user: this.authService.sanitizeUser(user),
    };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      isActive: user.isActive,
    };
  }
}
