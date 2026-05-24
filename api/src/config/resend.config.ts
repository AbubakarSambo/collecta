import { registerAs } from '@nestjs/config';

export default registerAs('resend', () => ({
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL || 'Collecta <noreply@collecta.africa>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
