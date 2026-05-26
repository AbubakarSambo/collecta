import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGINS || '',
  kenyaEnabled: process.env.KENYA_ENABLED === 'true',
}));
