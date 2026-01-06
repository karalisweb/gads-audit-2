import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'audit',
  password: process.env.DATABASE_PASSWORD || 'dev_password',
  database: process.env.DATABASE_NAME || 'google_ads_audit',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
}));
