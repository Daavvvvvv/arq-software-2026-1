import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { READ_DATA_SOURCE } from '@concert/database';
import { Tienda, Producto } from '@concert/domain';

@Injectable()
export class TiendasService {
  constructor(@Inject(READ_DATA_SOURCE) private readonly ds: DataSource) {}

  findAll(): Promise<Tienda[]> {
    return this.ds.getRepository(Tienda).find({ where: { activa: true } });
  }

  getMenu(tiendaId: string): Promise<Producto[]> {
    return this.ds.getRepository(Producto).find({
      where: { tiendaId, disponible: true },
    });
  }
}
