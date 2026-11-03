import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'assistencia-demo' },
    update: {},
    create: { name: 'Assistência Demo', slug: 'assistencia-demo', email: 'admin@techmanager.local' },
  });
  const passwordHash = await bcrypt.hash('TechManager@123', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@techmanager.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrador Demo',
      email: 'admin@techmanager.local',
      passwordHash,
      role: UserRole.OWNER,
    },
  });
  console.log('Usuário demo criado: admin@techmanager.local / TechManager@123');
  console.log('Troque a senha imediatamente e não use essas credenciais em produção.');
}

main().finally(async () => prisma.$disconnect());
