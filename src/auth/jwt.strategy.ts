import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// passport-jwt/passport are intentionally listed in package additions below.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: process.env.JWT_SECRET });
  }
  validate(payload: { sub: string; tenantId: string; role: string; email: string }) {
    return { userId: payload.sub, tenantId: payload.tenantId, role: payload.role, email: payload.email };
  }
}
