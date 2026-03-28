import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsString()
  artista!: string;

  @ApiProperty({ example: '2026-06-15T20:00:00Z' })
  @IsString()
  fecha!: string;
}

export class CreateTiendaDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsString()
  zona!: string;

  @ApiProperty()
  @IsString()
  recintoId!: string;
}

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

  @ApiProperty({ required: false, description: 'URL pública de la imagen del producto' })
  @IsString()
  @IsOptional()
  imagen?: string;
}

export class UpdateProductoDto extends CreateProductoDto {}
