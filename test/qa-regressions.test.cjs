const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { ValidationPipe } = require('@nestjs/common');
const { ServiceOrdersService } = require('../dist/src/service-orders/service-orders.service');
const { AppointmentsService } = require('../dist/src/appointments/appointments.service');
const { SearchService } = require('../dist/src/search/search.service');
const { CreateOrderDto, DeviceQueryDto } = require('../dist/src/service-orders/service-orders.dto');
const { SearchQueryDto } = require('../dist/src/search/search.controller');
const { CustomersService } = require('../dist/src/customers/customers.service');
const customerId = '11111111-1111-4111-8111-111111111111';
const deviceId = '22222222-2222-4222-8222-222222222222';
function orderFixture() {
  let devices = [];
  let orders = [];
  let calls = [];
  const tx = {
    customer: { findFirst: async ({ where }) => where.tenantId === 't1' && where.id === customerId ? { id: customerId } : null },
    device: {
      create: async ({ data }) => { const row = { id: deviceId, ...data }; devices.push(row); return row; },
      findFirst: async ({ where }) => { calls.push(where); return where.tenantId === 't1' && where.customerId === customerId && where.id === deviceId ? { id: deviceId } : null; },
      findMany: async args => { calls.push(args.where); return []; },
    },
    serviceOrder: {
      findFirst: async () => ({ number: 10 }),
      findMany: async args => { calls.push(args.where); return []; },
      create: async ({ data }) => { const row = { id: 'o1', ...data }; orders.push(row); return row; },
    },
    $queryRaw: async () => [],
  };
  const prisma = { ...tx, $transaction: async work => {
    const oldDevices = [...devices]; const oldOrders = [...orders];
    try { return await work(tx); } catch (error) { devices = oldDevices; orders = oldOrders; throw error; }
  } };
  return { service: new ServiceOrdersService(prisma), devices: () => devices, orders: () => orders, calls, tx };
}

test('TM-QA-002: new order atomically registers the device and preserves the authenticated tenant', async () => {
  const f = orderFixture();
  const result = await f.service.create('t1', { customerId, device: { brand: 'Samsung', model: 'A54', imei: '12345' }, reportedIssue: 'Tela sem imagem' });
  assert.equal(result.number, 11); assert.equal(result.tenantId, 't1'); assert.equal(result.deviceId, deviceId);
  assert.equal(f.devices()[0].customerId, customerId); assert.equal(f.devices()[0].tenantId, 't1');
});
test('TM-QA-002: existing device must belong to the selected customer and tenant', async () => {
  const f = orderFixture();
  const result = await f.service.create('t1', { customerId, deviceId, reportedIssue: 'Bateria com defeito' });
  assert.equal(result.deviceId, deviceId); assert.equal(f.devices().length, 0);
  assert.deepEqual(f.calls[0], { tenantId: 't1', id: deviceId, customerId });
  await assert.rejects(f.service.create('t1', { customerId, deviceId: 'foreign-device', reportedIssue: 'Teste' }), { status: 400 });
  await assert.rejects(f.service.create('t2', { customerId, device: { brand: 'Apple', model: '13' }, reportedIssue: 'Teste' }), { status: 400 });
  assert.equal(f.orders().length, 1);
});
test('TM-QA-002: rejects absent or ambiguous devices and rolls back device when order fails', async () => {
  const f = orderFixture();
  await assert.rejects(f.service.create('t1', { customerId, reportedIssue: 'Teste' }), { status: 400 });
  await assert.rejects(f.service.create('t1', { customerId, deviceId, device: { brand: 'Apple', model: '13' }, reportedIssue: 'Teste' }), { status: 400 });
  f.tx.serviceOrder.create = async () => { throw new Error('database unavailable'); };
  await assert.rejects(f.service.create('t1', { customerId, device: { brand: 'Apple', model: '13' }, reportedIssue: 'Teste' }), /database unavailable/);
  assert.equal(f.devices().length, 0); assert.equal(f.orders().length, 0);
});
test('TM-QA-002: device options and direct OS result stay tenant scoped', async () => {
  const f = orderFixture();
  await f.service.devices('t1', customerId); await f.service.list('t1', 'order1');
  assert.deepEqual(f.calls, [{ tenantId: 't1', customerId }, { tenantId: 't1', id: 'order1' }]);
});
test('TM-QA-002: DTO validates nested device fields, trims text and rejects tenant injection', async () => {
  const valid = plainToInstance(CreateOrderDto, { customerId, device: { brand: ' Apple ', model: ' iPhone 13 ' }, reportedIssue: ' Tela sem imagem ' });
  assert.equal((await validate(valid)).length, 0); assert.equal(valid.device.brand, 'Apple'); assert.equal(valid.reportedIssue, 'Tela sem imagem');
  for (const device of [{ brand: '', model: '13' }, { brand: 'Apple', model: ' ' }, { brand: 'A'.repeat(81), model: '13' }]) assert.ok((await validate(plainToInstance(CreateOrderDto, { customerId, device, reportedIssue: 'Teste' }))).length > 0);
  assert.ok((await validate(plainToInstance(DeviceQueryDto, { customerId: 'invalid' }))).length > 0);
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  await assert.rejects(pipe.transform({ customerId, deviceId, reportedIssue: 'Teste', tenantId: 't2' }, { type: 'body', metatype: CreateOrderDto }), { status: 400 });
});

test('TM-QA-003: global search queries all categories with tenant filters and bounded results', async () => {
  const calls = [];
  const fakeModel = (model, rows) => ({ findMany: async args => { calls.push({ model, args }); return rows; } });
  const service = new SearchService({
    customer: fakeModel('customer', [{ id: 'c1', name: 'QA', phone: '123' }]),
    serviceOrder: fakeModel('order', [{ id: 'o1', number: 15, customer: { name: 'QA' }, device: { brand: 'Apple', model: '13' } }]),
    product: fakeModel('product', [{ id: 'p1', name: 'Tela', sku: 'QA', stockQuantity: 3 }]),
    supplier: fakeModel('supplier', [{ id: 's1', name: 'Peças & Telas', tradeName: null }]),
  });
  const result = await service.search('t1', ' #00015 ');
  assert.equal(result.items.length, 4);
  assert.ok(result.items.some(r => r.href === '/clientes/c1'));
  assert.ok(result.items.some(r => r.href === '/ordens?orderId=o1'));
  assert.ok(result.items.some(r => r.href === '/produtos?productId=p1'));
  for (const { args } of calls) { assert.equal(args.where.tenantId, 't1'); assert.equal(args.take, 8); }
  assert.ok(calls.find(c => c.model === 'order').args.where.OR.some(c => c.number === 15));
  assert.deepEqual(await service.search('t1', 'x'), { items: [] });
  assert.equal(calls.length, 4);
  assert.ok((await validate(plainToInstance(SearchQueryDto, { q: 'a'.repeat(121) }))).length > 0);
});
test('TM-QA-003: customer deep link cannot read a different tenant', async () => {
  const service = new CustomersService({ customer: { findFirst: async ({ where }) => where.tenantId === 't1' && where.id === 'c1' ? { id: 'c1' } : null } });
  assert.deepEqual(await service.find('t1', 'c1'), { id: 'c1' });
  await assert.rejects(service.find('t2', 'c1'), { status: 404 });
});

test('TM-QA-004: API rejects 09:15, 09:30 and 10:00 as end of a 10:00 appointment', async () => {
  let writes = 0;
  const service = new AppointmentsService({ customer: { findFirst: async () => ({ id: customerId }) }, appointment: { create: async () => { writes++; } } });
  for (const endsAt of ['2026-11-05T09:15:00-03:00', '2026-11-05T09:30:00-03:00', '2026-11-05T10:00:00-03:00', 'invalid']) {
    await assert.rejects(service.create('t1', { customerId, title: 'QA', startsAt: '2026-11-05T10:00:00-03:00', endsAt }), { status: 400 });
  }
  assert.equal(writes, 0);
});
test('TM-QA-004: API preserves the exact 11:15 end and validates customer tenant', async () => {
  const service = new AppointmentsService({
    customer: { findFirst: async ({ where }) => where.tenantId === 't1' ? { id: customerId } : null },
    appointment: { create: async ({ data }) => data },
  });
  const input = { customerId, title: 'QA', startsAt: '2026-11-05T10:00:00-03:00', endsAt: '2026-11-05T11:15:00-03:00' };
  const result = await service.create('t1', input);
  assert.equal(result.startsAt.toISOString(), '2026-11-05T13:00:00.000Z');
  assert.equal(result.endsAt.toISOString(), '2026-11-05T14:15:00.000Z');
  await assert.rejects(service.create('t2', input), { status: 400 });
});
