const test = require('node:test');
const assert = require('node:assert/strict');
const { maskEmail } = require('../backend/src/utils/mask-email');
const { hashPassword, verifyPassword } = require('../backend/src/auth/password');

test('mascaramento mantém domínio, oculta nomes curtos e não expõe entradas inválidas', () => {
  assert.equal(maskEmail('person@example.test'), 'pe***@example.test');
  assert.equal(maskEmail('  person@example.test  '), 'pe***@example.test');
  assert.equal(maskEmail('ab@example.test'), 'a***@example.test');
  assert.equal(maskEmail('a@example.test'), '***@example.test');
  for (const value of [null, undefined, {}, '', 'invalid', 'a b@example.test', 'a@b@c.test', 'a\n@example.test']) {
    assert.equal(maskEmail(value), '***');
  }
});

test('scrypt usa salts individuais e rejeita senha incorreta e hash malformado', async () => {
  const password = 'Senha-de-teste-123';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.notEqual(first.split('$')[4], second.split('$')[4]);
  assert.match(first, /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('Outra-senha', first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
});
