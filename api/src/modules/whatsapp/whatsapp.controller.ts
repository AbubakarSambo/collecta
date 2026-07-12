import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { Public } from '../../common';

@ApiTags('WhatsApp')
@Controller()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Public()
  @Get('webhooks/whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp webhook verification handshake' })
  verifyWebhook(@Query() query: Record<string, string>, @Res() res: Response) {
    const challenge = this.whatsappService.verifyChallenge(
      query['hub.mode'],
      query['hub.verify_token'],
      query['hub.challenge'],
    );

    if (challenge === null) {
      return res.status(HttpStatus.FORBIDDEN).send();
    }

    return res.status(HttpStatus.OK).send(challenge);
  }

  @Public()
  @Post('webhooks/whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta WhatsApp status callback webhook' })
  async handleStatusWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    return this.whatsappService.handleStatusWebhook(req.rawBody!, signature);
  }
}
