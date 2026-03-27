import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get('metrics')
  metrics(): string {
    return [
      'KR1_adopcion_pct=0',
      'KR2_tiempo_promedio_seg=0',
      'KR3_fallidos_pct=0',
    ].join('\n');
  }
}
