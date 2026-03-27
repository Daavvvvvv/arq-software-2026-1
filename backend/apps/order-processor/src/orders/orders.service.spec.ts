import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { SnsService } from '@concert/messaging';
import { EstadoPedido } from '@concert/domain';

const mockDs = {
  getRepository: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ ...x, id: 'pedido-uuid' })),
    update: jest.fn().mockResolvedValue({}),
  }),
};

const mockSns = { publish: jest.fn().mockResolvedValue('msg-id') };

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: WRITE_DATA_SOURCE, useValue: mockDs },
        { provide: SnsService, useValue: mockSns },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('arn:test') } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw if user not found', async () => {
    mockDs.getRepository.mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null), create: jest.fn(), save: jest.fn(), update: jest.fn() });
    await expect(
      service.create({ items: [], zona: 'C', fila: '8', asiento: '14' }, 'user-id'),
    ).rejects.toThrow();
  });

  it('should validate order and emit order.validated', async () => {
    const mockRepo = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ id: 'user-id', email: 'a@b.com' })       // usuario
        .mockResolvedValueOnce({ id: 'boleta-id', vinculada: true, eventoId: 'evento-id' }) // boleta
        .mockResolvedValueOnce({ id: 'prod-id', precio: 25000, stock: 10, disponible: true, nombre: 'Hamburguesa' }), // producto
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ ...x, id: 'pedido-uuid' })),
      update: jest.fn().mockResolvedValue({}),
    };
    mockDs.getRepository.mockReturnValue(mockRepo);

    const result = await service.create(
      { items: [{ productoId: 'prod-id', cantidad: 1 }], zona: 'C', fila: '8', asiento: '14' },
      'user-id',
    );

    expect(result.estado).toBe(EstadoPedido.VALIDADO);
    expect(mockSns.publish).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ eventType: 'order.validated' }),
    );
  });
});
