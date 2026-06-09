import { registerAs } from '@nestjs/config';

export default registerAs('termii', () => ({
  apiKey: process.env.TERMII_API_KEY || '',
  senderId: process.env.TERMII_SENDER_ID || 'Collecta',
  baseUrl: process.env.TERMII_BASE_URL || 'https://v3.api.termii.com',
  whatsappDeviceId: process.env.TERMII_WHATSAPP_DEVICE_ID || '',
  whatsappTemplates: {
    FRIENDLY: process.env.TERMII_WHATSAPP_TEMPLATE_FRIENDLY || '',
    CLEAR: process.env.TERMII_WHATSAPP_TEMPLATE_CLEAR || '',
    FIRM: process.env.TERMII_WHATSAPP_TEMPLATE_FIRM || '',
    FORMAL: process.env.TERMII_WHATSAPP_TEMPLATE_FORMAL || '',
    GENERIC: process.env.TERMII_WHATSAPP_TEMPLATE_GENERIC || '',
  },
}));
