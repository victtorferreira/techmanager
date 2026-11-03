import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const users = await this.prisma.user.findMany({
      where: { email: email.toLowerCase(), active: true },
      include: { tenant: true },
      take: 2,
    });
    // Email is tenant-scoped. If more than one tenant has this email, require tenant slug
    // in a future login UX instead of guessing which account the user intended.
    if (users.length !== 1) throw new UnauthorizedException('Credenciais inválidas ou conta ambígua.');
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }
}
