import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { MercadoPagoService } from './mercadopago.service';
import { MpWebhookDto } from './dto/mp-webhook.dto';

@ApiTags('webhooks')
@Controller('webhook')
export class MercadoPagoController {
  constructor(private readonly mpService: MercadoPagoService) {}

  @ApiHeader({ name: 'x-signature', required: true })
  @Post('mp')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: MpWebhookDto,
    @Headers('x-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.mpService.handleWebhook(body, signature ?? '');
    return { received: true };
  }
}
