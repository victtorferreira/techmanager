const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ServiceOrdersService } = require('../dist/src/service-orders/service-orders.service');

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
const request = {
  name: 'Cliente', phone: '(11) 99999-9999', brand: 'Samsung', model: 'A54',
  reportedIssue: 'A tela está quebrada', devicePowersOn: true, liquidDamage: false,
  previousRepair: false, preferredContact: 'WHATSAPP',
};

function fixture() {
  let saved;
  let transactions = 0;
  const tx = {
    customer: { create: async () => ({ id: 'customer' }) },
    device: { create: async () => ({ id: 'device' }) },
    $queryRaw: async () => [],
    serviceOrder: {
      findFirst: async () => null,
      create: async ({ data }) => { saved = data; return { number: data.number }; },
    },
  };
  const service = new ServiceOrdersService({
    tenant: { findUnique: async () => ({ id: 'tenant', name: 'Assistência' }) },
    $transaction: async callback => { transactions++; return callback(tx); },
  });
  return { service, saved: () => saved, transactions: () => transactions };
}

test('public request persists photos and pickup address with the tenant order', async () => {
  const f = fixture();
  const result = await f.service.createPublicRequest('oficina', {
    ...request, deliveryMethod: 'PICKUP', pickupAddress: '  Rua Brasil, 123, Centro, São Paulo  ', devicePhotos: [photo],
  });
  assert.deepEqual(result, { number: 1, tenantName: 'Assistência' });
  assert.equal(f.saved().tenantId, 'tenant');
  assert.equal(f.saved().pickupAddress, 'Rua Brasil, 123, Centro, São Paulo');
  assert.equal(f.saved().deliveryMethod, 'PICKUP');
  assert.deepEqual(f.saved().devicePhotos, [photo]);
});

test('drop off discards stale pickup address and accepts requests without photos', async () => {
  const f = fixture();
  await f.service.createPublicRequest('oficina', { ...request, deliveryMethod: 'DROP_OFF', pickupAddress: 'Rua Brasil, 123' });
  assert.equal(f.saved().pickupAddress, null);
  assert.deepEqual(f.saved().devicePhotos, []);
  await f.service.createPublicRequest('oficina', request);
  assert.equal(f.saved().deliveryMethod, null);
});

test('invalid collection details and invalid photos are rejected before writing', async () => {
  const f = fixture();
  const oversized = `data:image/png;base64,${Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(600 * 1024)]).toString('base64')}`;
  for (const fields of [
    { deliveryMethod: 'PICKUP' }, { deliveryMethod: 'PICKUP', pickupAddress: 'curto' },
    { deliveryMethod: 'OTHER' }, { devicePhotos: [photo, photo, photo, photo] },
    { devicePhotos: ['https://example.com/photo.jpg'] },
    { devicePhotos: [photo.replace('image/png', 'image/jpeg')] },
    { devicePhotos: ['data:image/svg+xml;base64,PHN2Zz4='] },
    { devicePhotos: [oversized] },
  ]) {
    await assert.rejects(f.service.createPublicRequest('oficina', { ...request, ...fields }), { status: 400 });
  }
  assert.equal(f.transactions(), 0);
});

test('three photos at the per image size limit are accepted', async () => {
  const f = fixture();
  const bytes = Buffer.alloc(600 * 1024);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes);
  const largePhoto = `data:image/png;base64,${bytes.toString('base64')}`;
  await f.service.createPublicRequest('oficina', { ...request, devicePhotos: [largePhoto, largePhoto, largePhoto] });
  assert.equal(f.saved().devicePhotos.length, 3);
});
