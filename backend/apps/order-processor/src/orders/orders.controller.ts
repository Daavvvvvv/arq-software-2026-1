import { Body, Controller, Get, Param, Post, Request, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, JwtPayload, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(RolUsuario.CONSUMER)
  @Post()
  @HttpCode(202)
  create(
    @Body() dto: CreateOrderDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.ordersService.create(dto, req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Roles(RolUsuario.CONSUMER)
  @Get('mis-pedidos')
  misPedidos(@Request() req: { user: JwtPayload }) {
    return this.ordersService.misPedidos(req.user.sub);
  }
}
