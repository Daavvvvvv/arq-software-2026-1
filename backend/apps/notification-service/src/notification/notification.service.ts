import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { WRITE_DATA_SOURCE } from '@concert/database';
import {
  EstadoNotificacion,
  EventsLog,
  Notificacion,
  Pedido,
  Usuario,
} from '@concert/domain';
import { ConcertEvent } from '@concert/events';
import { FcmChannel } from '../channels/fcm.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';

const MENSAJES: Record<string, string> = {
  'order.validated': 'Pedido recibido, procesando pago...',
  'payment.confirmed': 'Pago confirmado, preparando tu pedido',
  'payment.failed': 'Hubo un problema con tu pago. Intenta de nuevo',
  'order.ready': 'Tu pedido está listo, un repartidor va en camino',
  'order.delivered': '¡Tu pedido llegó! Buen provecho',
};

function normalizeOptionalUuid(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

  private async resolveUsuarioId(event: ConcertEvent): Promise<string | null> {
    const usuarioIdFromEvent =
      'usuarioId' in event ? normalizeOptionalUuid(event.usuarioId) : null;

    if (usuarioIdFromEvent) {
      return usuarioIdFromEvent;
    }

    const pedidoId = event.pedidoId;
    if (!pedidoId) {
      return null;
    }

    const pedidoRepo = this.ds.getRepository(Pedido);

    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['usuario'],
    });

    if (!pedido) {
      this.logger.warn(
        `Notification: no se encontró pedido ${pedidoId} para resolver usuarioId`,
      );
      return null;
    }

    const pedidoAsAny = pedido as Pedido & {
      usuarioId?: string | null;
      usuario?: { id?: string | null } | null;
    };

    const usuarioIdFromPedido =
      normalizeOptionalUuid(pedidoAsAny.usuarioId) ??
      normalizeOptionalUuid(pedidoAsAny.usuario?.id ?? null);

    if (!usuarioIdFromPedido) {
      this.logger.warn(
        `Notification: pedido ${pedidoId} existe pero no tiene usuarioId`,
      );
      return null;
    }

    return usuarioIdFromPedido;
  }

  async handleEvent(event: ConcertEvent): Promise<void> {
    const mensaje = MENSAJES[event.eventType];
    if (!mensaje) return;

    const pedidoId = event.pedidoId;
    const usuarioId = await this.resolveUsuarioId(event);

    if (!usuarioId) {
      this.logger.error(
        `Notification [${event.eventType}] skipped for pedido ${pedidoId}: no se pudo resolver usuarioId`,
      );
      return;
    }

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

    const usuario = await this.ds
      .getRepository(Usuario)
      .findOne({ where: { id: usuarioId } });

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
        error = err instanceof Error ? err.message : String(err);
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

    this.logger.log(
      `Notification [${event.eventType}] sent via ${canal} for pedido ${pedidoId}`,
    );
  }

  async handleDlqAlert(body: Record<string, unknown>): Promise<void> {
    this.logger.error('[DLQ ALERT] Message in DLQ monitor queue', body);

    const pedidoIdRaw = body['pedidoId'];
    const correlationIdRaw = body['correlationId'];
    const tenantIdRaw = body['tenantId'];

    const correlationId =
      typeof correlationIdRaw === 'string'
        ? normalizeOptionalUuid(correlationIdRaw)
        : null;

    const tenantId =
      typeof tenantIdRaw === 'string'
        ? normalizeOptionalUuid(tenantIdRaw)
        : null;

    const eventLogPayload: Partial<EventsLog> & {
      eventType: string;
      pedidoId: string;
      payload: Record<string, unknown>;
    } = {
      eventType: 'DLQ_ALERT',
      pedidoId:
        typeof pedidoIdRaw === 'string' && pedidoIdRaw.trim().length > 0
          ? pedidoIdRaw.trim()
          : 'unknown',
      payload: body,
    };

    if (correlationId) {
      eventLogPayload.correlationId = correlationId;
    }

    if (tenantId) {
      eventLogPayload.tenantId = tenantId;
    }

    await this.ds.getRepository(EventsLog).save(eventLogPayload);
  }
}