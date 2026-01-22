export * from './login.dto';
export * from './register.dto';

// Re-export all DTOs from register.dto for convenience
export {
  AcceptInviteDto,
  InviteUserDto,
  SetupTwoFactorDto,
  ChangePasswordDto,
  VerifyTwoFactorDto,
  RequestOtpDto,
  VerifyOtpDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
  Toggle2FADto,
  UpdateProfileDto,
} from './register.dto';
