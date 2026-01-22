import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}

export class InviteUserDto {
  @IsEmail()
  @Matches(/@karalisweb\.net$/, {
    message: 'Only @karalisweb.net email addresses are allowed',
  })
  email: string;
}

export class SetupTwoFactorDto {
  @IsString()
  @MinLength(6)
  code: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  userId: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class RequestOtpDto {
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email: string;
}

export class VerifyPasswordResetDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}

export class Toggle2FADto {
  @IsBoolean()
  enabled: boolean;
}

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;
}
