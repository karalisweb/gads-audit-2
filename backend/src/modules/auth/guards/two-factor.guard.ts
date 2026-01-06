import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { SKIP_2FA_KEY } from '../../../common/decorators/skip-2fa.decorator';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skip2FA = this.reflector.getAllAndOverride<boolean>(SKIP_2FA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip2FA) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (!user.twoFactorAuthenticated) {
      throw new ForbiddenException('Two-factor authentication required');
    }

    return true;
  }
}
