import { Controller, Get, HttpCode, Param, Patch, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { map } from 'rxjs/operators';
import { JwtAuthGuard, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { KitchenService } from './kitchen.service';

@ApiTags('cocina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cocina')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Roles(RolUsuario.KITCHEN)
  @Get('pedidos')
  getPedidos() {
    return this.kitchenService.getPedidosEnPreparacion();
  }

  @Roles(RolUsuario.KITCHEN)
  @Get('pedidos/stream')
  stream(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sub = this.kitchenService.updates$
      .pipe(map((data) => `data: ${JSON.stringify(data)}\n\n`))
      .subscribe({
        next: (msg) => res.write(msg),
        error: () => res.end(),
      });

    res.on('close', () => sub.unsubscribe());
  }

  @Roles(RolUsuario.KITCHEN)
  @Patch('pedidos/:id/listo')
  @HttpCode(200)
  marcarListo(@Param('id') id: string) {
    return this.kitchenService.marcarListo(id);
  }

  @Roles(RolUsuario.KITCHEN)
  @Patch('pedidos/:id/cancelar')
  @HttpCode(200)
  cancelar(@Param('id') id: string) {
    return this.kitchenService.cancelar(id);
  }
}
