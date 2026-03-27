import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'asistente@test.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'test123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
