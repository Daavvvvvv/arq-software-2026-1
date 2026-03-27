import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KitchenService } from './kitchen.service';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { SnsService } from '@concert/messaging';
import { EstadoPedido } from '@concert/domain';

const mockRepo = {
  findOne: jest.fn().mockResolvedValue({
    id: 'pedido-1',
    numeroPedido: 'PED-001',
    estado: EstadoPedido.PAGADO,
    correlationId: 'corr-1',
    tenantId: 'tenant-1',
  }),
  update: jest.fn().mockResolvedValue({}),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve(x)),
};

const mockDs = { getRepository: jest.fn().mockReturnValue(mockRepo) };
const mockSns = { publish: jest.fn().mockResolvedValue('msg-id') };

describe('KitchenService', () => {
  let service: KitchenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenService,
        { provide: WRITE_DATA_SOURCE, useValue: mockDs },
        { provide: SnsService, useValue: mockSns },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('arn:test') } },
      ],
    }).compile();

    service = module.get<KitchenService>(KitchenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('handlePaymentConfirmed changes estado to EN_PREPARACION', async () => {
    await service.handlePaymentConfirmed('pedido-1', 'corr-1', 'tenant-1');
    expect(mockRepo.update).toHaveBeenCalledWith('pedido-1', { estado: EstadoPedido.EN_PREPARACION });
  });

  it('marcarListo publishes order.ready event', async () => {
    mockRepo.findOne.mockResolvedValueOnce({
      id: 'pedido-1',
      numeroPedido: 'PED-001',
      estado: EstadoPedido.EN_PREPARACION,
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
    });
    await service.marcarListo('pedido-1');
    expect(mockSns.publish).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ eventType: 'order.ready' }),
    );
  });
});
