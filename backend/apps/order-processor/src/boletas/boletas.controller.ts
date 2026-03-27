import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, JwtPayload, Roles, RolesGuard } from '@concert/auth';
import { RolUsuario } from '@concert/domain';
import { BoletasService } from './boletas.service';
import { VincularBoletaDto } from './dto/vincular-boleta.dto';

@ApiTags('boletas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('boletas')
export class BoletasController {
  constructor(private readonly boletasService: BoletasService) {}

  @Roles(RolUsuario.CONSUMER)
  @Post('vincular')
  vincular(
    @Body() dto: VincularBoletaDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.boletasService.vincular(dto.codigoQR, req.user.sub);
  }

  @Roles(RolUsuario.CONSUMER)
  @Get('mis-boletas')
  misBoletas(@Request() req: { user: JwtPayload }) {
    return this.boletasService.getMisBoletas(req.user.sub);
  }
}
