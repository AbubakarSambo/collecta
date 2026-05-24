import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  expiry: process.env.JWT_EXPIRY || '7d',
}));
