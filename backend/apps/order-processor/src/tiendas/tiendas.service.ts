import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { READ_DATA_SOURCE } from '@concert/database';
import { Tienda, Producto, Evento } from '@concert/domain';

@Injectable()
export class TiendasService {
  private readonly redis: Redis | null;
  private readonly logger = new Logger(TiendasService.name);

  constructor(
    @Inject(READ_DATA_SOURCE) private readonly ds: DataSource,
    private readonly config: ConfigService,
  ) {
    const redisHost = config.get<string>('REDIS_HOST');
    if (redisHost) {
      this.redis = new Redis({
        host: redisHost,
        port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
      });
    } else {
      this.redis = null;
      this.logger.warn('Redis not configured — menu caching disabled');
    }
  }

  findAll(): Promise<Tienda[]> {
    return this.ds.getRepository(Tienda).find({ where: { activa: true } });
  }

  getMenu(tiendaId: string): Promise<Producto[]> {
    return this.ds.getRepository(Producto).find({
      where: { tiendaId, disponible: true },
    });
  }

  async getMenuByEvento(eventoId: string): Promise<{ evento: string; tiendas: Array<{ id: string; nombre: string; zona: string; productos: Producto[] }> }> {
    const cacheKey = `menu:${eventoId}`;
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const evento = await this.ds.getRepository(Evento).findOne({
      where: { id: eventoId, activo: true },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado o no está activo');

    const tiendas = await this.ds.getRepository(Tienda).find({
      where: { recintoId: evento.recintoId, activa: true },
      relations: ['productos'],
    });

    const result = {
      evento: evento.nombre,
      tiendas: tiendas.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        zona: t.zona,
        productos: t.productos.filter((p) => p.disponible && p.stock > 0),
      })),
    };

    if (this.redis) {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    }
    return result;
  }

  async invalidateMenuCache(recintoId: string): Promise<void> {
    const eventos = await this.ds.getRepository(Evento).find({ where: { recintoId } });
    if (this.redis) {
      for (const e of eventos) {
        await this.redis.del(`menu:${e.id}`);
      }
    }
  }
}
