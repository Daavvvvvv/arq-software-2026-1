import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  precio!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty()
  @IsString()
  tiendaId!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class UpdateProductoDto extends CreateProductoDto {}
