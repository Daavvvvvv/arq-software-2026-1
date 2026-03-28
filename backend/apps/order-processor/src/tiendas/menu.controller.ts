import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TiendasService } from './tiendas.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly tiendasService: TiendasService) {}

  @Get(':eventoId')
  getMenuByEvento(@Param('eventoId') eventoId: string) {
    return this.tiendasService.getMenuByEvento(eventoId);
  }
}
