import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { Boleta } from '@concert/domain';

@Injectable()
export class BoletasService {
  constructor(@Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource) {}

  async vincular(codigoQR: string, usuarioId: string): Promise<Boleta> {
    const repo = this.ds.getRepository(Boleta);
    const boleta = await repo.findOne({ where: { codigoQR } });
    if (!boleta) throw new NotFoundException('Boleta no encontrada');
    if (boleta.vinculada && boleta.usuarioId !== usuarioId) {
      throw new BadRequestException('Boleta ya vinculada a otro usuario');
    }
    boleta.vinculada = true;
    boleta.usuarioId = usuarioId;
    return repo.save(boleta);
  }

  async getMisBoletas(usuarioId: string): Promise<Boleta[]> {
    return this.ds.getRepository(Boleta).find({
      where: { usuarioId, vinculada: true },
      relations: ['evento'],
    });
  }
}
