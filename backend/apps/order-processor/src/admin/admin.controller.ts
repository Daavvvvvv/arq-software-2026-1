import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { AdminService } from './admin.service';
import { CreateProductoDto, UpdateProductoDto } from './dto/create-producto.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.VENUE_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('productos')
  createProducto(@Body() dto: CreateProductoDto) {
    return this.adminService.createProducto(dto);
  }

  @Put('productos/:id')
  updateProducto(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.adminService.updateProducto(id, dto);
  }

  @Delete('productos/:id')
  deleteProducto(@Param('id') id: string) {
    return this.adminService.deleteProducto(id);
  }

  @Put('eventos/:id/activar')
  activarEvento(@Param('id') id: string) {
    return this.adminService.activarEvento(id);
  }

  @Get('metricas')
  getMetricas() {
    return this.adminService.getMetricas();
  }
}
