import { IsEmail, IsString, MinLength, IsUUID } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class VerifyTwoFactorDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(6)
  code: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
