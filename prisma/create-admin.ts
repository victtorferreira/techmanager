import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const tenantName = process.env.ADMIN_TENANT_NAME?.trim() || 'Minha Assistencia';
  const tenantSlug = process.env.ADMIN_TENANT_SLUG?.trim() || 'techmanager';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Defina ADMIN_EMAIL com um e-mail valido.');
  }
  if (!password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD precisa ter pelo menos 12 caracteres e no maximo 72 bytes.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) {
    throw new Error('ADMIN_TENANT_SLUG deve conter letras minusculas, numeros e hifens.');
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { email, role: UserRole.OWNER, active: true, tenant: { slug: tenantSlug } },
      });
      if (existing) {
        console.log('Administrador ja existe. A senha foi preservada.');
        return;
      }
      if (await tx.user.count()) {
        throw new Error('Este comando cria apenas o primeiro administrador de um banco vazio.');
      }
      const tenant = await tx.tenant.upsert({
        where: { slug: tenantSlug },
        update: {},
        create: { name: tenantName, slug: tenantSlug, email },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: 'Administrador',
          passwordHash: await bcrypt.hash(password, 12),
          role: UserRole.OWNER,
        },
      });
      console.log('Primeiro administrador criado com sucesso.');
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Do not include database connection details in deployment logs.
  console.error(error instanceof Error && error.constructor === Error
    ? error.message
    : 'Nao foi possivel criar o administrador. Verifique o banco e as migrations.');
  process.exitCode = 1;
});
