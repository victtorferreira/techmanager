const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, decimal } = require('./helpers/business.cjs');
const { ProductsService } = require('../dist/src/products/products.service');
const { ServiceOrdersService } = require('../dist/src/service-orders/service-orders.service');
const { FinanceService } = require('../dist/src/finance/finance.service');
const { ReportsService } = require('../dist/src/reports/reports.service');
const purchase = { type: 'PURCHASE', quantity: 2, unitCost: 125.25, supplierId: 's1', occurredAt: '2026-11-06' };
const pricing = { status: 'IN_REPAIR', laborAmount: 150, partsAmount: 200 };
const requestId = '11111111-1111-4111-8111-111111111111';
const payment = { requestId, amount: 100, paidAt: '2026-11-06', paymentMethod: 'PIX' };
const from = '2026-11-01T03:00:00Z', to = '2026-12-01T03:00:00Z';
function services() {
  const f = fixture();
  f.rows('serviceOrder')[0].estimatedDelivery = new Date('2026-11-10T15:00:00Z');
  return { ...f, products: new ProductsService(f.prisma), orders: new ServiceOrdersService(f.prisma), finance: new FinanceService(f.prisma), reports: new ReportsService(f.prisma) };
}

test('supplier purchase creates exactly one linked payable, then payment uses actual cash date', async () => {
  const f = services();
  const movement = await f.products.move('t1', 'p1', { ...purchase, requestId, payment: { status: 'PENDING', dueAt: '2026-11-20' } }, 'actor');
  const repeated = await f.products.move('t1', 'p1', { ...purchase, requestId, payment: { status: 'PENDING', dueAt: '2026-11-20' } }, 'actor');
  assert.equal(repeated.id, movement.id);
  assert.equal(f.rows('product')[0].stockQuantity, 12);
  assert.equal(f.rows('financialEntry').length, 1);
  const entry = f.rows('financialEntry')[0];
  assert.equal(entry.stockMovementId, movement.id);
  assert.equal(entry.amount.toString(), '250.5');
  let summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.expenses.toString(), '0');
  assert.equal(summary.totals.pendingExpenses.toString(), '250.5');
  await assert.rejects(f.products.move('t1', 'p1', { ...purchase, quantity: 3, requestId }), { status: 400 });
  await f.finance.updateStatus('t1', entry.id, 'PAID', 'PIX', '2026-12-02');
  summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.expenses.toString(), '0');
  assert.equal(summary.totals.pendingExpenses.toString(), '0');
  const december = await f.finance.summary('t1', to, '2027-01-01T03:00:00Z');
  assert.equal(december.totals.expenses.toString(), '250.5');
  assert.equal(december.entries[0].source, 'PURCHASE');
});

test('paid initial purchase is atomic; finance errors roll back both stock and history', async () => {
  const f = services();
  await f.products.create('t1', { name: 'Bateria', costPrice: 40.10, salePrice: 80, stockQuantity: 3, supplierId: 's1', purchaseDate: '2026-11-06', requestId, payment: { status: 'PAID', paymentMethod: 'CASH', paidAt: '2026-11-07' } }, 'actor');
  assert.equal(f.rows('financialEntry')[0].amount.toString(), '120.3');
  assert.equal(f.rows('financialEntry')[0].occurredAt.toISOString(), '2026-11-07T15:00:00.000Z');
  f.failFinance();
  await assert.rejects(f.products.move('t1', 'p1', purchase), /finance unavailable/);
  assert.equal(f.rows('product')[0].stockQuantity, 10);
  assert.equal(f.rows('stockMovement').length, 1);
  await assert.rejects(f.products.create('t1', { name: 'Outra', costPrice: 50, salePrice: 70, stockQuantity: 2, supplierId: 's1', purchaseDate: '2026-11-06' }), /finance unavailable/);
  assert.equal(f.rows('product').length, 2);
});

test('OS supports deposits, repeated requests, full payment and rejects overpayment or lower pricing', async () => {
  const f = services();
  await f.orders.update('t1', 'o1', pricing);
  await Promise.all([f.orders.pay('t1', 'o1', 'actor', payment), f.orders.pay('t1', 'o1', 'actor', payment)]);
  assert.equal(f.rows('financialEntry').filter(e => e.status === 'PAID').length, 1);
  assert.equal(f.rows('serviceOrder')[0].paymentStatus, 'PARTIAL');
  let summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.income.toString(), '100');
  assert.equal(summary.totals.pendingIncome.toString(), '250');
  await assert.rejects(f.orders.pay('t1', 'o1', 'actor', { ...payment, amount: 101 }), { status: 400 });
  await assert.rejects(f.orders.pay('t1', 'o1', 'actor', { ...payment, requestId: 'other', amount: 251 }), { status: 400 });
  await assert.rejects(f.orders.update('t1', 'o1', { ...pricing, laborAmount: 0, partsAmount: 50 }), { status: 400 });
  assert.equal(f.rows('serviceOrder')[0].totalAmount.toString(), '350');
  await f.orders.pay('t1', 'o1', 'actor', { ...payment, requestId: 'final', amount: 250 });
  assert.equal(f.rows('serviceOrder')[0].paymentStatus, 'PAID');
  summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.income.toString(), '350');
  assert.equal(summary.totals.pendingIncome.toString(), '0');
});

test('delivery does not mark an OS as paid; settling its receivable synchronizes the OS', async () => {
  const f = services();
  await f.orders.update('t1', 'o1', { ...pricing, status: 'DELIVERED' });
  assert.equal(f.rows('serviceOrder')[0].paymentStatus, 'PENDING');
  const pending = f.rows('financialEntry').find(e => e.status === 'PENDING');
  await f.finance.updateStatus('t1', pending.id, 'PAID', 'PIX', '2026-11-11');
  await f.finance.updateStatus('t1', pending.id, 'PAID', 'PIX', '2026-11-11');
  assert.equal(f.rows('serviceOrder')[0].paymentStatus, 'PAID');
  assert.equal(f.rows('financialEntry').filter(e => e.status === 'PAID').length, 1);
});

test('OS refunds preserve original cash entry, reopen remaining balance and cannot be repeated', async () => {
  const f = services();
  await f.orders.update('t1', 'o1', pricing);
  const entry = await f.orders.pay('t1', 'o1', 'actor', payment);
  await f.finance.updateStatus('t1', entry.id, 'CANCELED', 'PIX', '2026-11-09');
  await f.finance.updateStatus('t1', entry.id, 'CANCELED', 'PIX', '2026-11-09');
  assert.equal(f.rows('financialEntry').find(e => e.id === entry.id).status, 'PAID');
  assert.equal(f.rows('financialEntry').filter(e => e.reversalOfId === entry.id).length, 1);
  const summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.balance.toString(), '0');
  assert.equal(summary.totals.pendingIncome.toString(), '350');
  await f.orders.update('t1', 'o1', { ...pricing, status: 'CANCELED' });
  assert.equal((await f.finance.summary('t1', from, to)).totals.pendingIncome.toString(), '0');
});

test('purchase cancellation adjusts stock and preserves payment/refund; repeat is harmless', async () => {
  const f = services();
  await f.products.move('t1', 'p1', { ...purchase, payment: { status: 'PAID', paymentMethod: 'PIX', paidAt: '2026-11-06' } });
  const entry = f.rows('financialEntry')[0];
  await f.finance.updateStatus('t1', entry.id, 'CANCELED', 'PIX', '2026-11-07');
  await f.finance.updateStatus('t1', entry.id, 'CANCELED', 'PIX', '2026-11-07');
  assert.equal(f.rows('product')[0].stockQuantity, 10);
  assert.equal(f.rows('stockMovement').length, 2);
  assert.ok(f.rows('stockMovement')[0].canceledAt);
  const summary = await f.finance.summary('t1', from, to);
  assert.equal(summary.totals.balance.toString(), '0');
  const report = await f.reports.summary('t1', from, to);
  assert.equal(report.totals.purchases, 0);
  assert.equal(report.suppliers[0].paid, 0);
});

test('purchase cancellation with consumed stock fails without canceling payable or changing cash', async () => {
  const f = services();
  await f.products.move('t1', 'p1', purchase);
  await f.products.move('t1', 'p1', { type: 'LOSS', quantity: 12, notes: 'Perda' });
  await assert.rejects(f.finance.updateStatus('t1', f.rows('financialEntry')[0].id, 'CANCELED'), { status: 400 });
  assert.equal(f.rows('financialEntry')[0].status, 'PENDING');
  assert.equal(f.rows('stockMovement')[0].canceledAt, null);
  assert.equal(f.rows('product')[0].stockQuantity, 0);
});

test('parts retain historic cost, returns cannot exceed use and canceling requires full return', async () => {
  const f = services();
  await f.orders.update('t1', 'o1', pricing);
  await f.products.move('t1', 'p1', { type: 'SERVICE_ORDER', quantity: 2, serviceOrderId: 'o1' });
  f.rows('product')[0].costPrice = decimal(175);
  await assert.rejects(f.products.move('t1', 'p1', { type: 'RETURN', quantity: 3, serviceOrderId: 'o1' }), { status: 400 });
  await assert.rejects(f.orders.update('t1', 'o1', { ...pricing, status: 'CANCELED' }), { status: 400 });
  await f.products.move('t1', 'p1', { type: 'RETURN', quantity: 1, serviceOrderId: 'o1' });
  assert.equal(f.rows('stockMovement')[1].unitCost.toString(), '100');
  const report = await f.reports.summary('t1', from, to);
  assert.equal(report.totals.servicePartsCost, 100);
  assert.equal(report.totals.serviceResult, 250);
  await f.products.move('t1', 'p1', { type: 'RETURN', quantity: 1, serviceOrderId: 'o1' });
  await f.orders.update('t1', 'o1', { ...pricing, status: 'CANCELED' });
  assert.equal(f.rows('product')[0].stockQuantity, 10);
});

test('finance and reports agree on cash and pending totals; purchases are not counted twice', async () => {
  const f = services();
  await f.products.move('t1', 'p1', { ...purchase, payment: { status: 'PAID', paymentMethod: 'PIX', paidAt: '2026-11-06' } });
  await f.products.move('t1', 'p1', { ...purchase, unitCost: 50 });
  await f.orders.update('t1', 'o1', pricing);
  await f.orders.pay('t1', 'o1', 'actor', payment);
  const finance = await f.finance.summary('t1', from, to);
  const report = await f.reports.summary('t1', from, to);
  assert.equal(report.totals.income, Number(finance.totals.income));
  assert.equal(report.totals.expenses, 250.5);
  assert.equal(report.totals.balance, Number(finance.totals.balance));
  assert.equal(report.totals.pendingIncome, Number(finance.totals.pendingIncome));
  assert.equal(report.totals.pendingExpenses, Number(finance.totals.pendingExpenses));
  assert.equal(report.totals.purchases, 350.5);
  assert.equal(report.totals.serviceIncome, 100);
  assert.equal(report.suppliers[0].paid, 250.5);
  assert.equal(report.series.reduce((sum, row) => sum + row.income, 0), report.totals.income);
});

test('financial writes, receipts, stock and reports stay isolated by tenant', async () => {
  const f = services();
  await f.products.move('t1', 'p1', purchase);
  await f.orders.update('t1', 'o1', pricing);
  await assert.rejects(f.orders.update('t2', 'o1', pricing), { status: 404 });
  await assert.rejects(f.orders.pay('t2', 'o1', 'actor', payment), { status: 404 });
  await assert.rejects(f.finance.updateStatus('t2', f.rows('financialEntry')[0].id, 'PAID', 'PIX'), { status: 404 });
  await assert.rejects(f.products.move('t2', 'p1', purchase), { status: 404 });
  const report = await f.reports.summary('t2', from, to);
  assert.equal(report.totals.income, 0); assert.equal(report.totals.purchases, 0); assert.equal(report.totals.orders, 0);
});
