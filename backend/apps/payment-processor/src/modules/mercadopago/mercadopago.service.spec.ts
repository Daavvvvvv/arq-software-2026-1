import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoService } from './mercadopago.service';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

const SECRET = 'test-webhook-secret';

function makeSignature(payload: string, tsSeconds: number): string {
  const hmac = createHmac('sha256', SECRET).update(`${tsSeconds}:${payload}`).digest('hex');
  return `ts=${tsSeconds},v1=${hmac}`;
}

describe('MercadoPagoService', () => {
  let service: MercadoPagoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoPagoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MERCADOPAGO_WEBHOOK_SECRET') return SECRET;
              if (key === 'PAYMENT_PROVIDER') return 'mock';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MercadoPagoService>(MercadoPagoService);
  });

  it('validateSignature returns true with valid signature', () => {
    const payload = JSON.stringify({ type: 'payment' });
    const ts = Math.floor(Date.now() / 1000);
    const sig = makeSignature(payload, ts);
    expect(service.validateSignature(JSON.parse(payload) as unknown, sig)).toBe(true);
  });

  it('validateSignature returns false when timestamp > 5 minutes old (replay attack)', () => {
    const payload = JSON.stringify({ type: 'payment' });
    const oldTs = Math.floor(Date.now() / 1000) - 400; // 6.6 minutes ago
    const sig = makeSignature(payload, oldTs);
    expect(service.validateSignature(JSON.parse(payload) as unknown, sig)).toBe(false);
  });

  it('handleWebhook throws UnauthorizedException with invalid signature', async () => {
    await expect(
      service.handleWebhook({ type: 'payment' }, 'ts=123,v1=invalidsig'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
