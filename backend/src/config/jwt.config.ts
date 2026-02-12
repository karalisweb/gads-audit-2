import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '4h',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
