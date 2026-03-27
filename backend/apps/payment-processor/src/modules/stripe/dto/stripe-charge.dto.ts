import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StripeChargeDto {
  @ApiProperty()
  @IsString()
  pedidoId!: string;

  @ApiProperty()
  @IsNumber()
  monto!: number;
}
