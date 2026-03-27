import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { MercadoPagoService } from './modules/mercadopago/mercadopago.service';
import { StripeService } from './modules/stripe/stripe.service';
import { MockPaymentService } from './modules/mock/mock-payment.service';
import { EstadoPedido } from '@concert/domain';

const mockPedido: any = {
  id: 'pedido-1',
  numeroPedido: 'PED-001',
  total: 25000,
  estado: EstadoPedido.VALIDADO,
  usuario: { metodoPago: 'mercadopago' },
};

const mockMp = { charge: jest.fn().mockResolvedValue({ success: true, referencia: 'mp-ref' }) };
const mockStripe = { charge: jest.fn().mockResolvedValue({ success: true, referencia: 'stripe-ref' }) };
const mockMockSvc = { charge: jest.fn().mockResolvedValue({ success: true, referencia: 'mock-ref-123' }) };

describe('PaymentService', () => {
  let service: PaymentService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: MercadoPagoService, useValue: mockMp },
        { provide: StripeService, useValue: mockStripe },
        { provide: MockPaymentService, useValue: mockMockSvc },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('resolveStrategy returns MockPaymentService when PAYMENT_PROVIDER=mock', () => {
    const strategy = service.resolveStrategy('mercadopago');
    expect(strategy).toBe(mockMockSvc);
  });

  it('resolveStrategy returns MercadoPagoService when PAYMENT_PROVIDER=mercadopago', () => {
    jest.spyOn(configService, 'get').mockReturnValue('mercadopago');
    const strategy = service.resolveStrategy('mercadopago');
    expect(strategy).toBe(mockMp);
  });

  it('resolveStrategy returns StripeService when PAYMENT_PROVIDER=stripe and metodoPago=stripe', () => {
    jest.spyOn(configService, 'get').mockReturnValue('stripe');
    const strategy = service.resolveStrategy('stripe');
    expect(strategy).toBe(mockStripe);
  });

  it('resolveStrategy returns MercadoPagoService as default when metodoPago is undefined', () => {
    jest.spyOn(configService, 'get').mockReturnValue('mercadopago');
    const strategy = service.resolveStrategy('');
    expect(strategy).toBe(mockMp);
  });

  it('MockStrategy approves and returns referencia', async () => {
    const result = await service.charge(mockPedido);
    expect(result.success).toBe(true);
    expect(result.referencia).toBe('mock-ref-123');
  });
});
