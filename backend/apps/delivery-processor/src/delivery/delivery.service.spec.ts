import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeliveryService } from './delivery.service';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { SnsService } from '@concert/messaging';
import { EstadoEntrega, EstadoPedido } from '@concert/domain';

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

function makeMockDs(repartidorForZone: Record<string, typeof repartidorC | null>) {
  return {
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name = entity?.name ?? '';
      if (name === 'Repartidor') {
        return {
          findOne: jest.fn().mockImplementation(({ where }: any) => {
            return Promise.resolve(repartidorForZone[where.zona] ?? null);
          }),
          update: jest.fn().mockResolvedValue({}),
        };
      }
      if (name === 'Entrega') {
        return {
          create: jest.fn((x) => x),
          save: jest.fn((x) => Promise.resolve({ ...x, id: 'entrega-1' })),
          update: jest.fn().mockResolvedValue({}),
        };
      }
      return {
        findOne: jest.fn().mockResolvedValue(pedidoBase),
        update: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((x) => x),
        save: jest.fn((x) => Promise.resolve(x)),
      };
    }),
  };
}

const mockSns = { publish: jest.fn().mockResolvedValue('msg-id') };

describe('DeliveryService', () => {
  it('assigns repartidor from zona C for pedido in zona C', async () => {
    const mockDs = makeMockDs({ C: repartidorC, B: repartidorB });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: WRITE_DATA_SOURCE, useValue: mockDs },
        { provide: SnsService, useValue: mockSns },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('arn:test') } },
      ],
    }).compile();

    const service = module.get<DeliveryService>(DeliveryService);
    await service.handleOrderReady('pedido-1', 'corr-1', 'tenant-1');

    const repartidorRepo = mockDs.getRepository({name:'Repartidor'});
    expect(repartidorRepo.update).toHaveBeenCalledWith('rep-C', { disponible: false });
  });

  it('assigns repartidor from adjacent zone B when zona C is empty', async () => {
    const mockDs = makeMockDs({ C: null, B: repartidorB });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: WRITE_DATA_SOURCE, useValue: mockDs },
        { provide: SnsService, useValue: mockSns },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('arn:test') } },
      ],
    }).compile();

    const service = module.get<DeliveryService>(DeliveryService);
    await service.handleOrderReady('pedido-1', 'corr-1', 'tenant-1');

    const repartidorRepo = mockDs.getRepository({name:'Repartidor'});
    expect(repartidorRepo.update).toHaveBeenCalledWith('rep-B', { disponible: false });
  });
});
