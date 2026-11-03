import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, Tenant, User, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string) {
    email = email.trim().toLowerCase();
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Use uma senha com pelo menos 12 caracteres e no máximo 72 bytes.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (existing) throw new ConflictException('Não foi possível cadastrar este e-mail. Tente entrar na sua conta.');
        const tenant = await tx.tenant.create({
          data: { name: 'Minha assistência', slug: `assistencia-${randomUUID()}`, email },
        });
        const user = await tx.user.create({
          data: { tenantId: tenant.id, name: email.split('@')[0], email, passwordHash, role: UserRole.OWNER },
          include: { tenant: true },
        });
        return this.session(user);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) {
        throw new ConflictException('Não foi possível concluir o cadastro. Tente novamente ou entre na sua conta.');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const users = await this.prisma.user.findMany({
      where: { email: email.trim().toLowerCase(), active: true },
      include: { tenant: true },
      take: 2,
    });
    // Email is tenant-scoped. If more than one tenant has this email, require tenant slug
    // in a future login UX instead of guessing which account the user intended.
    if (users.length !== 1) throw new UnauthorizedException('Credenciais inválidas ou conta ambígua.');
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');
    return this.session(user);
  }

  private async session(user: User & { tenant: Tenant }) {
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }
}
