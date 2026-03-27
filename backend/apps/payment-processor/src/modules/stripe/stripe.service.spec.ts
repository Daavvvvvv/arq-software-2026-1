import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { UnauthorizedException } from '@nestjs/common';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PAYMENT_PROVIDER') return 'mock';
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_...'; // placeholder → no real Stripe client
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('validateSignature returns true in mock mode (no Stripe client)', () => {
    // stripe is null in mock mode, validateSignature returns true
    expect(service.validateSignature(Buffer.from('{}'), 'any-sig')).toBe(true);
  });

  it('handleWebhook with rawBody Buffer does not throw in mock mode', async () => {
    const rawBody = Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' }));
    await expect(service.handleWebhook(rawBody, 'sig')).resolves.not.toThrow();
  });

  it('handleWebhook throws UnauthorizedException when validateSignature fails', async () => {
    // Force validateSignature to return false by providing a real-looking secret
    jest.spyOn(service, 'validateSignature').mockReturnValue(false);
    await expect(service.handleWebhook({}, 'bad-sig')).rejects.toThrow(UnauthorizedException);
  });
});
