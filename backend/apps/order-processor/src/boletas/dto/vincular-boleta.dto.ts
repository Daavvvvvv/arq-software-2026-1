import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VincularBoletaDto {
  @ApiProperty({ example: 'QR-ASISTENTE-001' })
  @IsString()
  codigoQR!: string;
}
