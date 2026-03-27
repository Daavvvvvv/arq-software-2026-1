import { Type } from 'class-transformer';
import { IsArray, IsString, IsUUID, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productoId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ example: 'C' })
  @IsString()
  zona!: string;

  @ApiProperty({ example: '8' })
  @IsString()
  fila!: string;

  @ApiProperty({ example: '14' })
  @IsString()
  asiento!: string;
}
