import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { Public, Skip2FA, Roles, CurrentUser } from '../../common/decorators';
import { UserRole, User } from '../../entities/user.entity';
import { VerifyTwoFactorDto, AcceptInviteDto, InviteUserDto } from './dto';

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
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId);
    return { message: 'Logged out from all devices' };
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
      message: 'Invite sent successfully',
      // Only return token in development
      ...(process.env.NODE_ENV === 'development' && { inviteToken: result.inviteToken }),
    };
  }

  @Public()
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const user = await this.authService.acceptInvite(dto.token, dto.password);
    return {
      message: 'Account created successfully. Please set up 2FA to activate your account.',
      userId: user.id,
    };
  }

  @Skip2FA()
  @Get('2fa/setup')
  async setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @Skip2FA()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.authService.enableTwoFactor(userId, code);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    await this.authService.changePassword(userId, currentPassword, newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      totpEnabled: user.totpEnabled,
      isActive: user.isActive,
    };
  }
}
