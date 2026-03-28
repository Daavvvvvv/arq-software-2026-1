import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { WRITE_DATA_SOURCE } from '@concert/database';
import { Usuario, RolUsuario } from '@concert/domain';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WRITE_DATA_SOURCE) private readonly ds: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, nombre?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const exists = await this.ds.getRepository(Usuario).findOne({ where: { email } });
    if (exists) throw new BadRequestException('El email ya está registrado');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.ds.getRepository(Usuario).save(
      this.ds.getRepository(Usuario).create({
        email,
        passwordHash,
        nombre,
        rol: RolUsuario.CONSUMER,
      }),
    );
    return this.generateTokens(user);
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.ds.getRepository(Usuario).findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.generateTokens(user);
  }

  async refresh(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.ds.getRepository(Usuario).findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user);
  }

  private generateTokens(user: Usuario): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email, rol: user.rol, recintoId: user.recintoId ?? undefined };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });
    return { accessToken, refreshToken };
  }
}
