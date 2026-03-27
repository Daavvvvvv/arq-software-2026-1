import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const mode = config.get<string>('JWT_MODE') ?? 'local';
    if (mode === 'cognito') {
      const poolId = config.get<string>('COGNITO_USER_POOL_ID')!;
      const region = config.get<string>('COGNITO_REGION') ?? 'us-east-1';
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
        algorithms: ['RS256'],
      });
    } else {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev_secret',
      });
    }
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
