import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MpChargeDto {
  @ApiProperty()
  @IsString()
  pedidoId!: string;

  @ApiProperty()
  @IsNumber()
  monto!: number;

  @ApiProperty()
  @IsString()
  email!: string;
}
