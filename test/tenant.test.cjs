const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TenantService } = require('../dist/src/tenant/tenant.service');
const { TenantController } = require('../dist/src/tenant/tenant.controller');
const { ServiceOrdersService } = require('../dist/src/service-orders/service-orders.service');

const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';

function fixture() {
  const rows = [{ id: 'one', name: 'Oficina', slug: 'oficina', logo: null }, { id: 'two', name: 'Outra', logo: null }];
  const prisma = { tenant: {
    updateMany: async ({ where, data }) => {
      const row = rows.find(row => row.id === where.id);
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
    findUnique: async ({ where }) => rows.find(row => where.id ? row.id === where.id : row.slug === where.slug),
  } };
  return { rows, prisma, service: new TenantService(prisma) };
}

test('logo persists for the authenticated tenant, survives name changes and can be removed', async () => {
  const { service, rows } = fixture();
  assert.equal((await service.updateProfile('one', 'Oficina', logo)).logo, logo);
  assert.equal((await service.updateProfile('one', 'Novo nome')).logo, logo);
  assert.equal(rows[1].logo, null);
  assert.equal((await service.updateProfile('one', 'Novo nome', null)).logo, null);
});

test('invalid formats, mismatched signatures and oversized images cannot be saved', async () => {
  const { service, rows } = fixture();
  for (const value of ['https://example.com/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', logo.replace('image/png', 'image/jpeg'), `data:image/png;base64,${Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(256 * 1024)]).toString('base64')}`]) {
    await assert.rejects(service.updateProfile('one', 'Oficina', value), { status: 400 });
  }
  assert.equal(rows[0].logo, null);
});

test('only owners and administrators may change the identity', async () => {
  const { service } = fixture();
  const controller = new TenantController(service);
  for (const role of ['ATTENDANT', 'TECHNICIAN']) {
    assert.throws(() => controller.updateProfile({ user: { tenantId: 'one', role } }, { name: 'Oficina', logo }), { status: 403 });
  }
  for (const role of ['OWNER', 'ADMIN']) {
    assert.equal((await controller.updateProfile({ user: { tenantId: 'one', role } }, { name: 'Oficina', logo })).logo, logo);
  }
});

test('public assistance profile includes the saved logo', async () => {
  const { service, prisma } = fixture();
  await service.updateProfile('one', 'Oficina', logo);
  assert.equal((await new ServiceOrdersService(prisma).publicTenant('oficina')).logo, logo);
});
