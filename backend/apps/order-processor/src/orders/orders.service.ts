import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { WRITE_DATA_SOURCE } from '@concert/database';
import {
  Boleta, EstadoPedido, EventsLog, ItemPedido,
  Pedido, Producto, Usuario,
} from '@concert/domain';
import { SnsService } from '@concert/messaging';
import { OrderValidatedEvent } from '@concert/events';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly sns: SnsService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateOrderDto, usuarioId: string): Promise<{ numeroPedido: string; estado: string }> {
    const usuario = await this.ds.getRepository(Usuario).findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Verificar boleta vinculada
    const boleta = await this.ds.getRepository(Boleta).findOne({
      where: { usuarioId, vinculada: true },
    });
    if (!boleta) throw new BadRequestException('No tienes una boleta vinculada');

    // Verificar productos y calcular total
    let total = 0;
    const itemsData: Array<{ producto: Producto; cantidad: number }> = [];

    for (const item of dto.items) {
      const producto = await this.ds.getRepository(Producto).findOne({
        where: { id: item.productoId, disponible: true },
      });
      if (!producto) throw new NotFoundException(`Producto ${item.productoId} no disponible`);
      if (producto.stock < item.cantidad) {
        throw new BadRequestException(`Stock insuficiente para ${producto.nombre}`);
      }
      total += Number(producto.precio) * item.cantidad;
      itemsData.push({ producto, cantidad: item.cantidad });
    }

    const correlationId = randomUUID();
    const numeroPedido = `PED-${Date.now()}`;

    // Persistir pedido
    const pedido = await this.ds.getRepository(Pedido).save(
      this.ds.getRepository(Pedido).create({
        numeroPedido,
        estado: EstadoPedido.PENDIENTE,
        total,
        zona: dto.zona,
        fila: dto.fila,
        asiento: dto.asiento,
        usuarioId,
        correlationId,
        tenantId: boleta.eventoId,
      }),
    );

    // Persistir items y descontar stock
    for (const { producto, cantidad } of itemsData) {
      await this.ds.getRepository(ItemPedido).save(
        this.ds.getRepository(ItemPedido).create({
          pedidoId: pedido.id,
          productoId: producto.id,
          cantidad,
          precioUnitario: producto.precio,
        }),
      );
      await this.ds.getRepository(Producto).update(producto.id, {
        stock: producto.stock - cantidad,
      });
    }

    // Cambiar estado a VALIDADO
    await this.ds.getRepository(Pedido).update(pedido.id, { estado: EstadoPedido.VALIDADO });

    // Registrar en events_log
    await this.ds.getRepository(EventsLog).save({
      eventType: 'order.validated',
      pedidoId: pedido.id,
      correlationId,
      tenantId: pedido.tenantId,
      payload: { numeroPedido, total },
    });

    // Publicar a SNS
    const event: OrderValidatedEvent = {
      eventType: 'order.validated',
      pedidoId: pedido.id,
      tenantId: pedido.tenantId ?? '',
      usuarioId,
      correlationId,
      items: itemsData.map(({ producto, cantidad }) => ({
        productoId: producto.id,
        cantidad,
        precioUnitario: Number(producto.precio),
      })),
      total,
      ubicacion: { zona: dto.zona, fila: dto.fila, asiento: dto.asiento },
    };

    await this.sns.publish(
      this.config.get<string>('SNS_ORDER_EVENTS_ARN')!,
      event as unknown as Record<string, unknown>,
    );

    this.logger.log(`Order ${numeroPedido} validated and published`);
    return { numeroPedido, estado: EstadoPedido.VALIDADO };
  }

  async findOne(id: string): Promise<Pedido> {
    const pedido = await this.ds.getRepository(Pedido).findOne({
      where: { id },
      relations: ['items', 'items.producto', 'pago', 'entrega'],
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  async misPedidos(usuarioId: string): Promise<Pedido[]> {
    return this.ds.getRepository(Pedido).find({
      where: { usuarioId },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['items'],
    });
  }
}

