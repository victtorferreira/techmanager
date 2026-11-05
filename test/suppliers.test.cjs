const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { ValidationPipe } = require('@nestjs/common');
const { Prisma } = require('@prisma/client');
const { SuppliersService } = require('../dist/src/suppliers/suppliers.service');
const { SupplierDto, SupplierQueryDto } = require('../dist/src/suppliers/suppliers.dto');

function fixture() {
  const rows = [
    { id: 'one', tenantId: 'tenant-one', name: 'Peças A', active: true },
    { id: 'two', tenantId: 'tenant-two', name: 'Peças B', active: true },
  ];
  let lastList;
  const matches = (row, where) => row.tenantId === where.tenantId && (!where.id || row.id === where.id) && (where.active === undefined || row.active === where.active);
  const supplier = {
    findMany: async args => { lastList = args; return rows.filter(row => matches(row, args.where)).slice(args.skip, args.skip + args.take); },
    count: async ({ where }) => rows.filter(row => matches(row, where)).length,
    findFirst: async ({ where }) => rows.find(row => matches(row, where)) || null,
    create: async ({ data }) => { const row = { id: String(rows.length + 1), ...data }; rows.push(row); return row; },
    updateMany: async ({ where, data }) => {
      const row = rows.find(row => matches(row, where));
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
    deleteMany: async ({ where }) => {
      const index = rows.findIndex(row => matches(row, where));
      if (index < 0) return { count: 0 };
      rows.splice(index, 1);
      return { count: 1 };
    },
  };
  const prisma = { supplier, $transaction: async work => typeof work === 'function' ? work({ supplier }) : Promise.all(work) };
  return { rows, prisma, service: new SuppliersService(prisma), lastList: () => lastList };
}

test('supplier create normalizes optional fields and ignores client-selected tenant and id', async () => {
  const f = fixture();
  const saved = await f.service.create('tenant-one', {
    name: '  Fornecedor  ', email: ' COMPRAS@EXAMPLE.COM ', document: '12.345.678/0001-90',
    address: ' Rua Brasil, 10 ', notes: ' ', active: true, tenantId: 'tenant-two', id: 'two',
  });
  assert.equal(saved.tenantId, 'tenant-one');
  assert.notEqual(saved.id, 'two');
  assert.equal(saved.name, 'Fornecedor');
  assert.equal(saved.email, 'compras@example.com');
  assert.equal(saved.document, '12345678000190');
  assert.equal(saved.address, 'Rua Brasil, 10');
  assert.equal(saved.notes, null);
});

test('listing, updating and deleting are limited to the authenticated tenant', async () => {
  const f = fixture();
  assert.deepEqual((await f.service.list('tenant-one', { page: 1 })).items.map(row => row.id), ['one']);
  await assert.rejects(f.service.update('tenant-one', 'two', { name: 'Alterado', active: false }), { status: 404 });
  await assert.rejects(f.service.remove('tenant-one', 'two'), { status: 404 });
  assert.equal(f.rows[1].name, 'Peças B');
  assert.equal(f.rows[1].active, true);
  assert.equal(f.rows.length, 2);
  const updated = await f.service.update('tenant-one', 'one', { name: 'Novo nome', active: false, email: '' });
  assert.equal(updated.name, 'Novo nome');
  assert.equal(updated.email, null);
  assert.equal(updated.active, false);
  assert.equal((await f.service.list('tenant-one', { status: 'active', page: 1 })).total, 0);
  assert.equal((await f.service.list('tenant-one', { status: 'inactive', page: 1 })).total, 1);
  assert.deepEqual(await f.service.remove('tenant-one', 'one'), { deleted: true });
  assert.equal(f.rows.length, 1);
});

test('list applies server pagination, active status and formatted document search', async () => {
  const f = fixture();
  await f.service.list('tenant-one', { page: 2, search: '12.345.678/0001-90', status: 'active' });
  const args = f.lastList();
  assert.equal(args.skip, 20);
  assert.equal(args.take, 20);
  assert.equal(args.where.tenantId, 'tenant-one');
  assert.equal(args.where.active, true);
  assert.ok(args.where.OR.some(condition => condition.document?.contains === '12345678000190'));
  await f.service.list('tenant-one', { page: 1, search: 'Peças' });
  assert.ok(f.lastList().where.OR.some(condition => condition.name?.contains === 'Peças' && condition.name.mode === 'insensitive'));
});

test('duplicate documents return a readable conflict on create and update', async () => {
  const f = fixture();
  const conflict = () => { throw new Prisma.PrismaClientKnownRequestError('Duplicate', { code: 'P2002', clientVersion: '6' }); };
  f.prisma.supplier.create = conflict;
  f.prisma.supplier.updateMany = conflict;
  await assert.rejects(f.service.create('tenant-one', { name: 'Peças', active: true }), { status: 409 });
  await assert.rejects(f.service.update('tenant-one', 'one', { name: 'Peças', active: true }), { status: 409 });
});

test('DTO accepts optional empty fields and validates identifiers, contact details and pagination', async () => {
  const valid = plainToInstance(SupplierDto, { name: ' Peças ', active: true, document: '', email: '', state: '', phone: '' });
  assert.equal((await validate(valid)).length, 0);
  assert.equal(valid.name, 'Peças');
  for (const fields of [{ name: ' ' }, { document: '123' }, { document: 'letters' }, { email: 'invalid' }, { phone: 'abc' }, { active: 'true' }, { state: 'XX' }]) {
    const dto = plainToInstance(SupplierDto, { name: 'Peças', active: true, ...fields });
    assert.ok((await validate(dto)).length > 0);
  }
  const query = plainToInstance(SupplierQueryDto, { page: '2', status: 'inactive' });
  assert.equal((await validate(query)).length, 0);
  assert.equal(query.page, 2);
  for (const fields of [{ page: '0' }, { page: '1.5' }, { page: 'abc' }, { status: 'other' }, { search: 'a'.repeat(161) }]) {
    assert.ok((await validate(plainToInstance(SupplierQueryDto, fields))).length > 0);
  }
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  await assert.rejects(pipe.transform({ name: 'Peças', active: true, tenantId: 'tenant-two' }, { type: 'body', metatype: SupplierDto }), { status: 400 });
});
