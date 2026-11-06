const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { ValidationPipe } = require('@nestjs/common');
const { ProductsService } = require('../dist/src/products/products.service');
const { SalesService } = require('../dist/src/sales/sales.service');
const { CreateProductDto, ProductDto, MovementDto, PurchaseQueryDto } = require('../dist/src/products/products.dto');
function fixture() {
  let products = [{ id: 'p1', tenantId: 't1', name: 'Tela', active: true, stockQuantity: 3, costPrice: new Prisma.Decimal(250), salePrice: new Prisma.Decimal(400) }, { id: 'p2', tenantId: 't2', name: 'Bateria', active: true, stockQuantity: 8 }];
  let movements = [];
  let entries = [];
  const matches = (row, where) => Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object') return (v.gte === undefined || row[k] >= v.gte) && (v.lte === undefined || row[k] <= v.lte) && (v.lt === undefined || row[k] < v.lt) && (!v.in || v.in.includes(row[k]));
    return row[k] === v;
  });
  const tx = {
    product: {
      findFirst: async ({ where }) => products.find(p => matches(p, where)) || null,
      findMany: async ({ where }) => products.filter(p => matches(p, where)),
      findUniqueOrThrow: async ({ where }) => products.find(p => p.id === where.id),
      create: async ({ data }) => { const p = { id: 'new', active: true, ...data }; products.push(p); return p; },
      updateMany: async ({ where, data }) => {
        const p = products.find(p => matches(p, where)); if (!p) return { count: 0 };
        const { stockQuantity, ...rest } = data;
        Object.assign(p, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
        if (stockQuantity) p.stockQuantity += stockQuantity.increment ?? -stockQuantity.decrement;
        return { count: 1 };
      },
      update: async ({ where, data }) => { const p = products.find(p => p.id === where.id); Object.assign(p, data); return p; },
    },
    supplier: { findFirst: async ({ where }) => where.tenantId === 't1' && where.id === 's1' ? { id: 's1', name: 'Fornecedor A' } : null },
    serviceOrder: { findFirst: async ({ where }) => where.tenantId === 't1' && where.id === 'o1' ? { id: 'o1', number: 10 } : null },
    stockMovement: {
      create: async ({ data }) => { const row = { id: String(movements.length + 1), canceledAt: null, ...data, unitCost: new Prisma.Decimal(data.unitCost) }; movements.push(row); return row; },
      createMany: async ({ data }) => { for (const row of data) await tx.stockMovement.create({ data: row }); },
      findMany: async ({ where, skip = 0, take }) => movements.filter(m => matches(m, where)).slice(skip, take ? skip + take : undefined),
      count: async ({ where }) => movements.filter(m => matches(m, where)).length,
    },
    financialEntry: { create: async ({ data }) => { const row = { id: `entry${entries.length + 1}`, ...data }; entries.push(row); return row; } },
    sale: { findFirst: async () => null, create: async ({ data }) => ({ id: 'sale1', ...data }) },
    $queryRaw: async () => [],
  };
  const prisma = { ...tx, $transaction: async work => {
    if (typeof work !== 'function') return Promise.all(work);
    const previousProducts = products.map(p => ({ ...p })); const previousMovements = [...movements]; const previousEntries = [...entries];
    try { return await work(tx); } catch (e) { products = previousProducts; movements = previousMovements; entries = previousEntries; throw e; }
  } };
  return { service: new ProductsService(prisma), sales: new SalesService(prisma), tx, products: () => products, movements: () => movements, entries: () => entries };
}
test('purchase records original supplier, exact cost, date, actor and resulting balance', async () => {
  const f = fixture();
  const result = await f.service.move('t1', 'p1', { type: 'PURCHASE', quantity: 2, unitCost: 251.25, occurredAt: '2026-11-01', supplierId: 's1' }, 'user1');
  assert.equal(result.quantity, 2); assert.equal(result.balanceAfter, 5); assert.equal(result.unitCost.toString(), '251.25');
  assert.equal(result.supplierName, 'Fornecedor A'); assert.equal(result.createdById, 'user1');
  assert.equal(result.occurredAt.toISOString(), '2026-11-01T15:00:00.000Z');
  assert.equal(f.entries()[0].stockMovementId, result.id);
  assert.equal(f.entries()[0].amount.toString(), '502.5');
  assert.equal(f.entries()[0].status, 'PENDING');
  assert.equal(f.products()[0].supplierId, 's1');
});
test('OS consumption, returns, defects, inventory adjustments and warranty preserve signed ledger', async () => {
  const f = fixture();
  for (const input of [
    { type: 'SERVICE_ORDER', quantity: 2, serviceOrderId: 'o1' },
    { type: 'RETURN', quantity: 1, serviceOrderId: 'o1' },
    { type: 'LOSS', quantity: 1, notes: 'Defeito' },
    { type: 'ADJUSTMENT', quantity: 2, notes: 'Contagem' },
    { type: 'WARRANTY', quantity: -1, notes: 'Enviada ao fornecedor' },
    { type: 'WARRANTY', quantity: 1, notes: 'Reposição recebida' },
  ]) await f.service.move('t1', 'p1', input);
  assert.deepEqual(f.movements().map(m => m.quantity), [-2, 1, -1, 2, -1, 1]);
  assert.deepEqual(f.movements().map(m => m.balanceAfter), [1, 2, 1, 3, 2, 3]);
});
test('insufficient stock, invalid references and cross-tenant operations do not mutate balances', async () => {
  const f = fixture();
  for (const input of [
    { type: 'LOSS', quantity: 4, notes: 'Perda' },
    { type: 'SERVICE_ORDER', quantity: 1 },
    { type: 'SERVICE_ORDER', quantity: 1, serviceOrderId: 'other-tenant-order' },
    { type: 'PURCHASE', quantity: 1, unitCost: 10, occurredAt: '2026-11-01', supplierId: 'other-tenant-supplier' },
    { type: 'PURCHASE', quantity: 1, unitCost: null, occurredAt: '2026-11-01', supplierId: 's1' },
    { type: 'ADJUSTMENT', quantity: 0, notes: 'Contagem' },
    { type: 'RETURN', quantity: -1 },
  ]) await assert.rejects(f.service.move('t1', 'p1', input), { status: 400 });
  await assert.rejects(f.service.move('t1', 'p2', { type: 'RETURN', quantity: 1 }), { status: 404 });
  await assert.rejects(f.service.history('t1', 'p2'), { status: 404 });
  await assert.rejects(f.service.update('t1', 'p2', { name: 'Inválido', costPrice: 0, salePrice: 0 }), { status: 404 });
  assert.equal(f.products()[0].stockQuantity, 3); assert.equal(f.products()[1].stockQuantity, 8); assert.equal(f.movements().length, 0);
});
test('failure to write history rolls back the stock update', async () => {
  const f = fixture(); f.tx.stockMovement.create = async () => { throw new Error('ledger unavailable'); };
  await assert.rejects(f.service.move('t1', 'p1', { type: 'RETURN', quantity: 2 }), /ledger unavailable/);
  assert.equal(f.products()[0].stockQuantity, 3);
});
test('sale records its stock consumption and reference in the same transaction', async () => {
  const f = fixture();
  const sale = await f.sales.create('t1', 'user1', { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'PIX' });
  assert.equal(f.products()[0].stockQuantity, 1);
  assert.equal(f.movements()[0].type, 'SALE'); assert.equal(f.movements()[0].quantity, -2);
  assert.equal(f.movements()[0].balanceAfter, 1); assert.equal(f.movements()[0].saleId, sale.id);
});
test('sale ledger failure rolls back stock instead of leaving an untracked output', async () => {
  const f = fixture();
  f.tx.stockMovement.createMany = async () => { throw new Error('ledger unavailable'); };
  await assert.rejects(f.sales.create('t1', 'user1', { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'PIX' }), /ledger unavailable/);
  assert.equal(f.products()[0].stockQuantity, 3); assert.equal(f.movements().length, 0);
});
test('a balance changed after reading is rejected by the conditional stock update', async () => {
  const f = fixture();
  f.tx.product.updateMany = async ({ where }) => {
    assert.equal(where.tenantId, 't1'); assert.equal(where.id, 'p1'); assert.equal(where.stockQuantity.gte, 2);
    return { count: 0 };
  };
  await assert.rejects(f.service.move('t1', 'p1', { type: 'SERVICE_ORDER', quantity: 2, serviceOrderId: 'o1' }), { status: 400 });
  assert.equal(f.movements().length, 0);
});
test('initial stock is either an opening balance or a supplier purchase; update cannot silently change stock', async () => {
  const f = fixture();
  await f.service.create('t1', { name: 'Nova peça', costPrice: 25, salePrice: 50, stockQuantity: 2 });
  assert.equal(f.movements()[0].type, 'INITIAL');
  await f.service.create('t1', { name: 'Outra peça', costPrice: 30, salePrice: 60, stockQuantity: 4, supplierId: 's1', purchaseDate: '2026-11-02' });
  assert.equal(f.movements()[1].type, 'PURCHASE');
  await f.service.update('t1', 'p1', { name: 'Tela editada', costPrice: 250, salePrice: 400, stockQuantity: 100 });
  assert.equal(f.products()[0].stockQuantity, 3);
});
test('purchase totals use quantity times historical cost, include all matching rows and exclude other movements', async () => {
  const f = fixture();
  await f.service.move('t1', 'p1', { type: 'PURCHASE', quantity: 3, unitCost: 250.10, supplierId: 's1', occurredAt: '2026-11-01' });
  await f.service.move('t1', 'p1', { type: 'PURCHASE', quantity: 2, unitCost: 85, supplierId: 's1', occurredAt: '2026-11-02' });
  await f.service.move('t1', 'p1', { type: 'RETURN', quantity: 1 });
  const report = await f.service.purchases('t1', { page: 1, supplierId: 's1', from: '2026-11-01', to: '2026-11-02' });
  assert.equal(report.total, 2); assert.equal(report.totalAmount.toString(), '920.3');
  assert.equal(report.suppliers[0].quantity, 5); assert.equal(report.suppliers[0].purchases, 2);
  const empty = await f.service.purchases('t2', { page: 1 }); assert.equal(empty.totalAmount.toString(), '0');
  await assert.rejects(f.service.purchases('t1', { from: '2026-11-03', to: '2026-11-01' }), { status: 400 });
});
test('DTO rejects invalid quantities, fractional currency, invalid dates and tenant injection', async () => {
  for (const input of [{ type: 'PURCHASE', quantity: 1.5 }, { type: 'SALE', quantity: 1 }, { type: 'PURCHASE', quantity: 1, unitCost: 0.001 }, { type: 'PURCHASE', quantity: 1, occurredAt: '2026-02-30' }]) assert.ok((await validate(plainToInstance(MovementDto, input))).length > 0);
  assert.equal((await validate(plainToInstance(CreateProductDto, { name: ' Tela ', costPrice: 250, salePrice: 0, stockQuantity: 3 }))).length, 0);
  assert.equal((await validate(plainToInstance(PurchaseQueryDto, { page: '2', from: '2026-11-01' }))).length, 0);
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  await assert.rejects(pipe.transform({ name: 'Tela', costPrice: 0, salePrice: 0, stockQuantity: 100 }, { type: 'body', metatype: ProductDto }), { status: 400 });
  await assert.rejects(pipe.transform({ name: 'Tela', costPrice: 0, salePrice: 0, tenantId: 't2' }, { type: 'body', metatype: CreateProductDto }), { status: 400 });
});
