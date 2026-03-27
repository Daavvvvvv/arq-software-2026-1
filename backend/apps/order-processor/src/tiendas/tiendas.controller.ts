import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@concert/auth';
import { TiendasService } from './tiendas.service';

@ApiTags('tiendas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tiendas')
export class TiendasController {
  constructor(private readonly tiendasService: TiendasService) {}

  @Get()
  findAll() {
    return this.tiendasService.findAll();
  }

  @Get(':id/menu')
  getMenu(@Param('id') id: string) {
    return this.tiendasService.getMenu(id);
  }
}
