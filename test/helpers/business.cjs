const { Prisma } = require('@prisma/client');
const decimal = value => new Prisma.Decimal(value);
function fixture() {
  let tables = {
    product: [{ id: 'p1', tenantId: 't1', name: 'Tela', active: true, stockQuantity: 10, costPrice: decimal(100), salePrice: decimal(180), purchaseDate: null }],
    supplier: [{ id: 's1', tenantId: 't1', name: 'Fornecedor A' }],
    serviceOrder: [{ id: 'o1', tenantId: 't1', number: 1, status: 'RECEIVED', laborAmount: decimal(0), partsAmount: decimal(0), totalAmount: decimal(0), estimatedDelivery: null, paymentStatus: 'PENDING', createdAt: new Date('2026-11-06T15:00:00Z') }],
    stockMovement: [], financialEntry: [], sale: [], customer: [], appointment: [], saleItem: [],
  };
  let sequence = 0;
  let failFinance = false;
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    const actual = row[key];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return (value.in === undefined || value.in.includes(actual)) && (value.gte === undefined || actual >= value.gte) && (value.lt === undefined || actual < value.lt) && (value.lte === undefined || actual <= value.lte);
    }
    return (actual ?? null) === value;
  });
  const enrich = (model, row, include) => {
    if (!row) return null;
    const result = { ...row };
    if (model === 'financialEntry') {
      result.reversal = tables.financialEntry.find(e => e.reversalOfId === row.id) ?? null;
      result.stockMovement = tables.stockMovement.find(m => m.id === row.stockMovementId) ?? null;
      const original = tables.financialEntry.find(e => e.id === row.reversalOfId);
      result.reversalOf = original ? { ...original, stockMovement: tables.stockMovement.find(m => m.id === original.stockMovementId) ?? null } : null;
      result.createdBy = null;
    }
    if (model === 'serviceOrder') {
      result.stockMovements = tables.stockMovement.filter(m => m.serviceOrderId === row.id && matches(m, include?.stockMovements?.where));
      result.financialEntries = tables.financialEntry.filter(e => e.serviceOrderId === row.id);
    }
    return result;
  };
  const normalize = (model, data) => {
    const row = { ...data };
    for (const key of ['amount', 'unitCost', 'costPrice', 'salePrice', 'laborAmount', 'partsAmount', 'totalAmount']) if (row[key] !== undefined) row[key] = decimal(row[key]);
    return row;
  };
  const tx = { $queryRaw: async () => [] };
  for (const model of Object.keys(tables)) {
    tx[model] = {
      findMany: async ({ where, include, skip = 0, take } = {}) => tables[model].filter(row => matches(row, where)).slice(skip, take ? skip + take : undefined).map(row => enrich(model, row, include)),
      findFirst: async ({ where, include }) => enrich(model, tables[model].find(row => matches(row, where)), include),
      findUnique: async ({ where, include }) => enrich(model, tables[model].find(row => matches(row, where)), include),
      findUniqueOrThrow: async ({ where }) => { const row = tables[model].find(row => matches(row, where)); if (!row) throw new Error('Not found'); return enrich(model, row); },
      count: async ({ where }) => tables[model].filter(row => matches(row, where)).length,
      groupBy: async () => [],
      create: async ({ data }) => {
        if (model === 'financialEntry' && failFinance) throw new Error('finance unavailable');
        const row = normalize(model, { id: `${model}${++sequence}`, sequence, canceledAt: null, sourceKey: null, stockMovementId: null, serviceOrderId: null, reversalOfId: null, createdById: null, occurredAt: new Date(), createdAt: new Date(), ...data });
        for (const field of ['sourceKey', 'stockMovementId', 'reversalOfId', 'requestKey']) if (row[field] && tables[model].some(other => other[field] === row[field])) throw new Error(`Duplicate ${field}`);
        tables[model].push(row); return enrich(model, row);
      },
      update: async ({ where, data }) => {
        const row = tables[model].find(row => matches(row, where));
        if (!row) throw new Error('Not found');
        Object.assign(row, normalize(model, data)); return enrich(model, row);
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const row of tables[model].filter(row => matches(row, where))) {
          for (const [key, value] of Object.entries(normalize(model, data))) {
            if (value === undefined) continue;
            row[key] = value && typeof value === 'object' && ('increment' in value || 'decrement' in value) ? row[key] + (value.increment ?? -value.decrement) : value;
          }
          count++;
        }
        return { count };
      },
      upsert: async ({ where, create, update }) => tables[model].some(row => matches(row, where)) ? tx[model].update({ where, data: update }) : tx[model].create({ data: create }),
    };
  }
  let queue = Promise.resolve();
  const prisma = { ...tx, $transaction: work => {
    if (typeof work !== 'function') return Promise.all(work);
    const result = queue.then(async () => {
      const snapshot = Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.map(row => ({ ...row }))]));
      try { return await work(tx); } catch (error) { tables = snapshot; throw error; }
    });
    queue = result.catch(() => {});
    return result;
  } };
  return { prisma, tx, rows: model => tables[model], failFinance: () => { failFinance = true; } };
}
module.exports = { fixture, decimal };
