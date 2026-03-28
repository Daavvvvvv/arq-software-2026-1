import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { RabbitMQService } from '@concert/messaging';
import { EstadoPedido } from '@concert/domain';

const pedidoBase = {
  id: 'pedido-1',
  numeroPedido: 'PED-001',
  estado: EstadoPedido.LISTO,
  zona: 'C',
  fila: '8',
  asiento: '14',
  correlationId: 'corr-1',
  tenantId: 'tenant-1',
  createdAt: new Date(Date.now() - 30000),
};

const repartidorC = { id: 'rep-C', nombre: 'Carlos', zona: 'C', disponible: true };
const repartidorB = { id: 'rep-B', nombre: 'Ana', zona: 'B', disponible: true };

const mockRabbitmq = { publish: jest.fn().mockResolvedValue(undefined) };

async function buildService(repartidorForZone: Record<string, typeof repartidorC | null>) {
  const repartidorRepo = {
    findOne: jest.fn().mockImplementation(({ where }: any) =>
      Promise.resolve(repartidorForZone[where.zona] ?? null),
    ),
    update: jest.fn().mockResolvedValue({}),
  };
  const entregaRepo = {
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ ...x, id: 'entrega-1' })),
    update: jest.fn().mockResolvedValue({}),
  };
  const pedidoRepo = {
    findOne: jest.fn().mockResolvedValue(pedidoBase),
    update: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(x)),
  };
  const eventsLogRepo = {
    save: jest.fn().mockResolvedValue({}),
  };

  const mockDs = {
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name = entity?.name ?? '';
      if (name === 'Repartidor') return repartidorRepo;
      if (name === 'Entrega') return entregaRepo;
      if (name === 'EventsLog') return eventsLogRepo;
      return pedidoRepo;
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DeliveryService,
      { provide: WRITE_DATA_SOURCE, useValue: mockDs },
      { provide: RabbitMQService, useValue: mockRabbitmq },
    ],
  }).compile();

  return { service: module.get<DeliveryService>(DeliveryService), repartidorRepo };
}

describe('DeliveryService', () => {
  it('assigns repartidor from zona C for pedido in zona C', async () => {
    const { service, repartidorRepo } = await buildService({ C: repartidorC, B: repartidorB });
    await service.handleOrderReady('pedido-1', 'corr-1', 'tenant-1');
    expect(repartidorRepo.update).toHaveBeenCalledWith('rep-C', { disponible: false });
  });

  it('assigns repartidor from adjacent zone B when zona C is empty', async () => {
    const { service, repartidorRepo } = await buildService({ C: null, B: repartidorB });
    await service.handleOrderReady('pedido-1', 'corr-1', 'tenant-1');
    expect(repartidorRepo.update).toHaveBeenCalledWith('rep-B', { disponible: false });
  });
});
