import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { EstadoNotificacion, EventsLog, Notificacion, Usuario } from '@concert/domain';
import { ConcertEvent } from '@concert/events';
import { FcmChannel } from '../channels/fcm.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';

const MENSAJES: Record<string, string> = {
  'order.validated':   'Pedido recibido, procesando pago...',
  'payment.confirmed': 'Pago confirmado, preparando tu pedido',
  'payment.failed':    'Hubo un problema con tu pago. Intenta de nuevo',
  'order.ready':       'Tu pedido está listo, un repartidor va en camino',
  'order.delivered':   '¡Tu pedido llegó! Buen provecho',
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly fcm: FcmChannel,
    private readonly email: EmailChannel,
    private readonly sms: SmsChannel,
    private readonly config: ConfigService,
  ) {}

  async handleEvent(event: ConcertEvent): Promise<void> {
    const mensaje = MENSAJES[event.eventType];
    if (!mensaje) return;

    const pedidoId = event.pedidoId;
    const usuarioId = 'usuarioId' in event ? event.usuarioId : '';

    // Persist notification (PENDIENTE)
    const notifRepo = this.ds.getRepository(Notificacion);
    const notif = await notifRepo.save(
      notifRepo.create({
        usuarioId,
        pedidoId,
        eventType: event.eventType,
        mensaje,
        estado: EstadoNotificacion.PENDIENTE,
      }),
    );

    let enviado = false;
    let canal = '';
    let error = '';

    // Get user for contact info
    const usuario = usuarioId
      ? await this.ds.getRepository(Usuario).findOne({ where: { id: usuarioId } })
      : null;

    // Canal 1: FCM
    try {
      enviado = await this.fcm.send(usuario?.fcmToken, 'Concert Orders', mensaje);
      canal = 'fcm';
    } catch (err) {
      this.logger.warn(`FCM failed for ${pedidoId}`, err);
    }

    // Canal 2: Email fallback
    if (!enviado && usuario?.email) {
      try {
        enviado = await this.email.send(usuario.email, 'Concert Orders', mensaje);
        canal = 'email';
      } catch (err) {
        this.logger.warn(`Email failed for ${pedidoId}`, err);
        error = String(err);
      }
    }

    // Canal 3: SMS stub (last resort)
    if (!enviado) {
      await this.sms.send(null, mensaje);
      canal = 'sms';
    }

    await notifRepo.update(notif.id, {
      estado: enviado ? EstadoNotificacion.ENVIADO : EstadoNotificacion.FALLIDO,
      canal,
      error,
    });

    this.logger.log(`Notification [${event.eventType}] sent via ${canal} for pedido ${pedidoId}`);
  }

  async handleDlqAlert(body: Record<string, unknown>): Promise<void> {
    this.logger.error('[DLQ ALERT] Message in DLQ monitor queue', body);
    await this.ds.getRepository(EventsLog).save({
      eventType: 'DLQ_ALERT',
      pedidoId: String(body['pedidoId'] ?? 'unknown'),
      correlationId: String(body['correlationId'] ?? ''),
      tenantId: String(body['tenantId'] ?? ''),
      payload: body,
    });
  }
}
