"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
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
            role: client_1.UserRole.OWNER,
        },
    });
    console.log('Usuário demo criado: admin@techmanager.local / TechManager@123');
    console.log('Troque a senha imediatamente e não use essas credenciais em produção.');
}
main().finally(async () => prisma.$disconnect());
//# sourceMappingURL=seed.js.map