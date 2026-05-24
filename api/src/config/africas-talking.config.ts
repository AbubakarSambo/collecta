import { registerAs } from '@nestjs/config';

export default registerAs('africasTalking', () => ({
  apiKey: process.env.AFRICAS_TALKING_API_KEY || '',
  username: process.env.AFRICAS_TALKING_USERNAME || 'sandbox',
}));
