import { IsString, IsInt, IsEmail, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecintoDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsString()
  ciudad!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacidad!: number;
}

export class CreateVenueAdminDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsUUID()
  recintoId!: string;
}
