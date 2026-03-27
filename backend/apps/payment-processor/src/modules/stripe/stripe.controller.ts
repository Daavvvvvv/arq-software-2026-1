import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@ApiTags('webhooks')
@Controller('webhook')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @ApiHeader({ name: 'stripe-signature', required: true })
  @Post('stripe')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    // Pass raw body buffer — Stripe requires unparsed body for signature validation
    const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
    await this.stripeService.handleWebhook(rawBody, signature ?? '');
    return { received: true };
  }
}
