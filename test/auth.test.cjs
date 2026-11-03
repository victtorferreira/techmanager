const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { JwtService } = require('@nestjs/jwt');
const { Prisma } = require('@prisma/client');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AuthService } = require('../dist/src/auth/auth.service');
const { RegisterDto } = require('../dist/src/auth/auth.controller');

const password = 'UmaSenhaForte@2026';
function fixture({ existing = false, transactionError } = {}) {
  const saved = { tenants: [], users: [] };
  const jwt = new JwtService({ secret: 'test-only-secret' });
  const tx = {
    tenant: { create: async ({ data }) => {
      const tenant = { id: `tenant-${saved.tenants.length}`, ...data };
      saved.tenants.push(tenant);
      return tenant;
    } },
    user: {
      findFirst: async ({ where }) => {
        assert.equal(where.email.mode, 'insensitive');
        return existing ? { id: 'existing' } : null;
      },
      create: async ({ data }) => {
        const user = { id: `user-${saved.users.length}`, active: true, ...data,
          tenant: saved.tenants.find(tenant => tenant.id === data.tenantId) };
        saved.users.push(user);
        return user;
      },
    },
  };
  const prisma = {
    $transaction: async (callback, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      if (transactionError) throw transactionError;
      return callback(tx);
    },
    user: { findMany: async ({ where }) => saved.users.filter(user => user.email === where.email && user.active) },
  };
  return { service: new AuthService(prisma, jwt), saved, jwt };
}

test('register hashes the password, normalizes email and returns a valid session without secrets', async () => {
  const { service, saved, jwt } = fixture();
  const session = await service.register('  OWNER@example.com ', password);
  assert.equal(saved.users[0].email, 'owner@example.com');
  assert.equal(saved.users[0].role, 'OWNER');
  assert.notEqual(saved.users[0].passwordHash, password);
  assert.equal(await bcrypt.compare(password, saved.users[0].passwordHash), true);
  assert.equal(session.user.email, 'owner@example.com');
  assert.equal(session.tenant.id, saved.users[0].tenantId);
  const token = await jwt.verifyAsync(session.accessToken);
  assert.equal(token.tenantId, session.tenant.id);
  assert.equal('passwordHash' in session.user, false);
  assert.equal('passwordHash' in token, false);
});

test('different registrations receive separate workspaces', async () => {
  const { service } = fixture();
  const first = await service.register('first@example.com', password);
  const second = await service.register('second@example.com', password);
  assert.notEqual(first.tenant.id, second.tenant.id);
  assert.notEqual(first.tenant.slug, second.tenant.slug);
});

test('existing email cannot create a user or workspace', async () => {
  const { service, saved } = fixture({ existing: true });
  await assert.rejects(service.register('existing@example.com', password), error => error.getStatus() === 409);
  assert.equal(saved.users.length, 0);
  assert.equal(saved.tenants.length, 0);
});

test('short and oversized UTF-8 passwords are rejected before persistence', async () => {
  const { service, saved } = fixture();
  for (const value of ['short', 'á'.repeat(37)]) {
    await assert.rejects(service.register('owner@example.com', value), error => error.getStatus() === 400);
  }
  assert.equal(saved.users.length, 0);
});

test('concurrent registration conflicts return 409', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '6' });
  const { service } = fixture({ transactionError: error });
  await assert.rejects(service.register('owner@example.com', password), value => value.getStatus() === 409);
});

test('registered account can log in and incorrect passwords are rejected', async () => {
  const { service } = fixture();
  await service.register('owner@example.com', password);
  const session = await service.login(' OWNER@example.com ', password);
  assert.equal(session.user.email, 'owner@example.com');
  await assert.rejects(service.login('owner@example.com', 'wrong-password'), error => error.getStatus() === 401);
});

test('registration DTO validates email/password and rejects client-selected tenant or role', async () => {
  const valid = plainToInstance(RegisterDto, { email: ' OWNER@example.com ', password });
  assert.equal(valid.email, 'owner@example.com');
  assert.equal((await validate(valid)).length, 0);
  const invalid = plainToInstance(RegisterDto, { email: 'invalid', password: 'short', role: 'ADMIN', tenantId: 'another-tenant' });
  const errors = await validate(invalid, { whitelist: true, forbidNonWhitelisted: true });
  assert.deepEqual(errors.map(error => error.property).sort(), ['email', 'password', 'role', 'tenantId']);
});
