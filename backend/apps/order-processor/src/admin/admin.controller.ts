import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, JwtPayload, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { AdminService } from './admin.service';
import { CreateProductoDto, UpdateProductoDto, CreateTiendaDto, CreateEventoDto } from './dto/create-producto.dto';
import { CreateRecintoDto, CreateVenueAdminDto } from './dto/super-admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── SUPER_ADMIN: recintos ─────────────────────────────────────────────────

  @Roles(RolUsuario.SUPER_ADMIN)
  @Post('recintos')
  createRecinto(@Body() dto: CreateRecintoDto) {
    return this.adminService.createRecinto(dto);
  }

  @Roles(RolUsuario.SUPER_ADMIN)
  @Get('recintos')
  getRecintos() {
    return this.adminService.getRecintos();
  }

  @Roles(RolUsuario.SUPER_ADMIN)
  @Post('venue-admins')
  createVenueAdmin(@Body() dto: CreateVenueAdminDto) {
    return this.adminService.createVenueAdmin(dto);
  }

  // ── VENUE_ADMIN: tiendas ──────────────────────────────────────────────────

  @Roles(RolUsuario.VENUE_ADMIN)
  @Post('tiendas')
  createTienda(
    @Body() dto: CreateTiendaDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.createTienda(dto, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Get('tiendas')
  getTiendas(@Request() req: { user: JwtPayload }) {
    return this.adminService.getTiendasByRecinto(req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Get('tiendas/:id/productos')
  getProductosByTienda(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.getProductosByTienda(id, req.user.recintoId!);
  }

  // ── VENUE_ADMIN: productos ────────────────────────────────────────────────

  @Roles(RolUsuario.VENUE_ADMIN)
  @Post('productos')
  createProducto(
    @Body() dto: CreateProductoDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.createProducto(dto, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Put('productos/:id')
  updateProducto(
    @Param('id') id: string,
    @Body() dto: UpdateProductoDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.updateProducto(id, dto, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Delete('productos/:id')
  deleteProducto(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.deleteProducto(id, req.user.recintoId!);
  }

  // ── VENUE_ADMIN: eventos ────────────────────────────────────────────────

  @Roles(RolUsuario.VENUE_ADMIN)
  @Post('eventos')
  createEvento(
    @Body() dto: CreateEventoDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.createEvento(dto, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Get('eventos')
  getEventos(@Request() req: { user: JwtPayload }) {
    return this.adminService.getEventosByRecinto(req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Put('eventos/:id/activar')
  activarEvento(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.activarEvento(id, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Delete('eventos/:id')
  deleteEvento(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.adminService.deleteEvento(id, req.user.recintoId!);
  }

  @Roles(RolUsuario.VENUE_ADMIN)
  @Get('metricas')
  getMetricas() {
    return this.adminService.getMetricas();
  }
}
