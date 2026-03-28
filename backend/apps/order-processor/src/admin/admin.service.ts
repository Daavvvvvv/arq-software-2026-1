import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { WRITE_DATA_SOURCE, READ_DATA_SOURCE } from '@concert/database';
import { Pedido, Producto, Evento, EstadoPedido, Entrega, Tienda, Recinto, Usuario, RolUsuario, ItemPedido } from '@concert/domain';
import { CreateProductoDto, UpdateProductoDto, CreateTiendaDto, CreateEventoDto } from './dto/create-producto.dto';
import { CreateRecintoDto, CreateVenueAdminDto } from './dto/super-admin.dto';
import { TiendasService } from '../tiendas/tiendas.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly writeDs: DataSource,
    @Inject(READ_DATA_SOURCE) private readonly readDs: DataSource,
    private readonly tiendasService: TiendasService,
  ) {}

  // ── SUPER_ADMIN ──────────────────────────────────────────────────────────────

  createRecinto(dto: CreateRecintoDto): Promise<Recinto> {
    return this.writeDs.getRepository(Recinto).save(
      this.writeDs.getRepository(Recinto).create(dto),
    );
  }

  getRecintos(): Promise<Recinto[]> {
    return this.readDs.getRepository(Recinto).find({ relations: ['tiendas'] });
  }

  async createVenueAdmin(dto: CreateVenueAdminDto): Promise<Omit<Usuario, 'passwordHash'>> {
    const exists = await this.writeDs.getRepository(Usuario).findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('El email ya está en uso');
    const recinto = await this.writeDs.getRepository(Recinto).findOne({ where: { id: dto.recintoId } });
    if (!recinto) throw new NotFoundException('Recinto no encontrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.writeDs.getRepository(Usuario).save(
      this.writeDs.getRepository(Usuario).create({
        email: dto.email,
        nombre: dto.nombre,
        passwordHash,
        rol: RolUsuario.VENUE_ADMIN,
        recintoId: dto.recintoId,
      }),
    );
    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ── VENUE_ADMIN ──────────────────────────────────────────────────────────────

  createTienda(dto: CreateTiendaDto, recintoId: string): Promise<Tienda> {
    return this.writeDs.getRepository(Tienda).save(
      this.writeDs.getRepository(Tienda).create({ ...dto, recintoId }),
    );
  }

  getTiendasByRecinto(recintoId: string): Promise<Tienda[]> {
    return this.readDs.getRepository(Tienda).find({ where: { recintoId, activa: true } });
  }

  async getProductosByTienda(tiendaId: string, recintoId: string): Promise<Producto[]> {
    const tienda = await this.readDs.getRepository(Tienda).findOne({ where: { id: tiendaId, recintoId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada en tu recinto');
    return this.readDs.getRepository(Producto).find({ where: { tiendaId, disponible: true } });
  }

  async createProducto(dto: CreateProductoDto, recintoId: string): Promise<Producto> {
    const tienda = await this.writeDs.getRepository(Tienda).findOne({ where: { id: dto.tiendaId, recintoId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada en tu recinto');
    const producto = await this.writeDs.getRepository(Producto).save(
      this.writeDs.getRepository(Producto).create(dto),
    );
    await this.tiendasService.invalidateMenuCache(recintoId);
    return producto;
  }

  async updateProducto(id: string, dto: UpdateProductoDto, recintoId: string): Promise<Producto> {
    const p = await this.writeDs.getRepository(Producto).findOne({ where: { id }, relations: ['tienda'] });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (p.tienda.recintoId !== recintoId) throw new NotFoundException('Producto no pertenece a tu recinto');
    await this.writeDs.getRepository(Producto).update(id, dto);
    const updated = await this.writeDs.getRepository(Producto).findOne({ where: { id } });
    await this.tiendasService.invalidateMenuCache(recintoId);
    return updated!;
  }

  async deleteProducto(id: string, recintoId: string): Promise<void> {
    const p = await this.writeDs.getRepository(Producto).findOne({ where: { id }, relations: ['tienda'] });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (p.tienda.recintoId !== recintoId) throw new NotFoundException('Producto no pertenece a tu recinto');
    await this.writeDs.getRepository(Producto).update(id, { disponible: false });
    await this.tiendasService.invalidateMenuCache(recintoId);
  }

  createEvento(dto: CreateEventoDto, recintoId: string): Promise<Evento> {
    return this.writeDs.getRepository(Evento).save(
      this.writeDs.getRepository(Evento).create({
        nombre: dto.nombre,
        artista: dto.artista,
        fecha: new Date(dto.fecha),
        recintoId,
      }),
    );
  }

  getEventosByRecinto(recintoId: string): Promise<Evento[]> {
    return this.readDs.getRepository(Evento).find({
      where: { recintoId },
      order: { fecha: 'DESC' },
    });
  }

  async activarEvento(id: string, recintoId: string): Promise<Evento> {
    const e = await this.writeDs.getRepository(Evento).findOne({ where: { id, recintoId } });
    if (!e) throw new NotFoundException('Evento no encontrado en tu recinto');
    await this.writeDs.getRepository(Evento).update(id, { activo: !e.activo });
    return { ...e, activo: !e.activo };
  }

  async deleteEvento(id: string, recintoId: string): Promise<void> {
    const e = await this.writeDs.getRepository(Evento).findOne({ where: { id, recintoId } });
    if (!e) throw new NotFoundException('Evento no encontrado en tu recinto');
    await this.writeDs.getRepository(Evento).delete(id);
  }

  async getMetricas(): Promise<{
    kr1_adopcion_pct: number;
    kr2_tiempo_promedio_seg: number;
    kr3_fallidos_pct: number;
    pedidos_por_hora: { hora: string; total: number }[];
    top_productos: { nombre: string; count: number }[];
  }> {
    const totalPedidos = await this.readDs.getRepository(Pedido).count();
    const entregados = await this.readDs.getRepository(Pedido).count({
      where: { estado: EstadoPedido.ENTREGADO },
    });
    const kr1 = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;

    const avgResult = await this.readDs.getRepository(Entrega)
      .createQueryBuilder('e')
      .select('AVG(e.tiempoTotal)', 'avg')
      .getRawOne<{ avg: string }>();
    const kr2 = avgResult?.avg ? Math.round(Number(avgResult.avg)) : 0;

    // KR3: pedidos en DLQ — aproximado por pedidos en estado CANCELADO
    const cancelados = await this.readDs.getRepository(Pedido).count({
      where: { estado: EstadoPedido.CANCELADO },
    });
    const kr3 = totalPedidos > 0 ? Math.round((cancelados / totalPedidos) * 100) : 0;

    // Pedidos por hora (últimas 6 horas)
    const pedidosPorHora = await this.readDs.getRepository(Pedido)
      .createQueryBuilder('p')
      .select("DATE_TRUNC('hour', p.\"createdAt\")", 'hora')
      .addSelect('COUNT(*)', 'total')
      .where("p.\"createdAt\" >= NOW() - INTERVAL '6 hours'")
      .groupBy("DATE_TRUNC('hour', p.\"createdAt\")")
      .orderBy('hora', 'ASC')
      .getRawMany<{ hora: string; total: string }>();
    const pedidos_por_hora = pedidosPorHora.map((r) => ({
      hora: r.hora,
      total: Number(r.total),
    }));

    // Top 5 productos más pedidos
    const topProductos = await this.readDs.getRepository(ItemPedido)
      .createQueryBuilder('ip')
      .innerJoin('ip.producto', 'prod')
      .select('prod.nombre', 'nombre')
      .addSelect('SUM(ip.cantidad)', 'count')
      .groupBy('prod.nombre')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<{ nombre: string; count: string }>();
    const top_productos = topProductos.map((r) => ({
      nombre: r.nombre,
      count: Number(r.count),
    }));

    return {
      kr1_adopcion_pct: kr1,
      kr2_tiempo_promedio_seg: kr2,
      kr3_fallidos_pct: kr3,
      pedidos_por_hora,
      top_productos,
    };
  }
}
