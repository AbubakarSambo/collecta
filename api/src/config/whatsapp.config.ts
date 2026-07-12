import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0',
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  useMetaWhatsapp: process.env.WHATSAPP_USE_META === 'true',
  templates: {
    FRIENDLY: process.env.WHATSAPP_TEMPLATE_FRIENDLY || '',
    CLEAR: process.env.WHATSAPP_TEMPLATE_CLEAR || '',
    FIRM: process.env.WHATSAPP_TEMPLATE_FIRM || '',
    FORMAL: process.env.WHATSAPP_TEMPLATE_FORMAL || '',
    GENERIC: process.env.WHATSAPP_TEMPLATE_GENERIC || '',
  },
}));
