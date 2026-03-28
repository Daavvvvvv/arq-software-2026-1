import { Controller, Get, HttpCode, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { DeliveryService } from './delivery.service';

@ApiTags('repartidor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repartidor')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Roles(RolUsuario.DISPATCHER)
  @Get('pedidos')
  getPedidos() {
    return this.deliveryService.getPedidosEnEntrega();
  }

  @Roles(RolUsuario.DISPATCHER)
  @Get('historial')
  getHistorial() {
    return this.deliveryService.getHistorialEntregas();
  }

  @Roles(RolUsuario.DISPATCHER)
  @Get('pedidos/:id')
  getDetalle(@Param('id') id: string) {
    return this.deliveryService.getDetallePedido(id);
  }

  @Roles(RolUsuario.DISPATCHER)
  @Patch('pedidos/:id/entregar')
  @HttpCode(200)
  entregar(@Param('id') id: string) {
    return this.deliveryService.confirmarEntrega(id);
  }
}
