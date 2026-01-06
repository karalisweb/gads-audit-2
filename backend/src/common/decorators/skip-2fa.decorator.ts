import { SetMetadata } from '@nestjs/common';

export const SKIP_2FA_KEY = 'skip2fa';
export const Skip2FA = () => SetMetadata(SKIP_2FA_KEY, true);
