import { registerAs } from '@nestjs/config';

function requireEnv(name: string, fallbackInDev?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'development' && fallbackInDev) return fallbackInDev;
  throw new Error(`Environment variable ${name} is required. Set it in your .env file.`);
}

export default registerAs('jwt', () => ({
  secret: requireEnv('JWT_SECRET', 'dev-only-jwt-secret-min-32-chars-long!!'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-min-32-chars!!'),
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '4h',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
