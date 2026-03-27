import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WRITE_DATA_SOURCE, READ_DATA_SOURCE } from '@concert/database';
import { Pedido, Producto, Evento, EstadoPedido, Entrega } from '@concert/domain';
import { CreateProductoDto, UpdateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly writeDs: DataSource,
    @Inject(READ_DATA_SOURCE) private readonly readDs: DataSource,
  ) {}

  createProducto(dto: CreateProductoDto): Promise<Producto> {
    return this.writeDs.getRepository(Producto).save(
      this.writeDs.getRepository(Producto).create(dto),
    );
  }

  async updateProducto(id: string, dto: UpdateProductoDto): Promise<Producto> {
    await this.writeDs.getRepository(Producto).update(id, dto);
    const p = await this.writeDs.getRepository(Producto).findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }

  async deleteProducto(id: string): Promise<void> {
    await this.writeDs.getRepository(Producto).update(id, { disponible: false });
  }

  async activarEvento(id: string): Promise<Evento> {
    await this.writeDs.getRepository(Evento).update(id, { activo: true });
    const e = await this.writeDs.getRepository(Evento).findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return e;
  }

  async getMetricas(): Promise<{
    kr1_adopcion_pct: number;
    kr2_tiempo_promedio_seg: number;
    kr3_fallidos_pct: number;
    pedidos_por_minuto: number[];
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

    return {
      kr1_adopcion_pct: kr1,
      kr2_tiempo_promedio_seg: kr2,
      kr3_fallidos_pct: kr3,
      pedidos_por_minuto: [],
      top_productos: [],
    };
  }
}
