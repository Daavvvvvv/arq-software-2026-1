import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { FcmChannel } from '../channels/fcm.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { EstadoNotificacion } from '@concert/domain';

const mockRepo = {
  findOne: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com', fcmToken: null }),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve({ ...x, id: 'notif-1' })),
  update: jest.fn().mockResolvedValue({}),
};
const mockDs = { getRepository: jest.fn().mockReturnValue(mockRepo) };
const mockFcm = { send: jest.fn().mockResolvedValue(true) };
const mockEmail = { send: jest.fn().mockResolvedValue(true) };
const mockSms = { send: jest.fn().mockResolvedValue(undefined) };

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: WRITE_DATA_SOURCE, useValue: mockDs },
        { provide: FcmChannel, useValue: mockFcm },
        { provide: EmailChannel, useValue: mockEmail },
        { provide: SmsChannel, useValue: mockSms },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get<NotificationService>(NotificationService);
  });

  it.each([
    'order.validated',
    'payment.confirmed',
    'payment.failed',
    'order.ready',
    'order.delivered',
  ] as const)('generates Notificacion for eventType %s', async (eventType) => {
    await service.handleEvent({ eventType, pedidoId: 'p1', tenantId: 't1', correlationId: 'c1' } as any);
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType, pedidoId: 'p1' }),
    );
  });

  it('uses email fallback when FCM fails', async () => {
    mockFcm.send.mockRejectedValueOnce(new Error('FCM error'));
    await service.handleEvent({
      eventType: 'order.validated',
      pedidoId: 'p1',
      tenantId: 't1',
      correlationId: 'c1',
      usuarioId: 'user-1',
    } as any);
    expect(mockEmail.send).toHaveBeenCalled();
  });
});
