// json-fidelity-checks.mjs
import assert from 'node:assert/strict';

const lossy = JSON.parse('{"id":9007199254740993}');
assert.equal(String(lossy.id), '9007199254740992');
assert.equal(Number.isSafeInteger(lossy.id), false);

const exact = JSON.parse('{"id":"9007199254740993","code":"00123"}');
assert.equal(exact.id, '9007199254740993');
assert.equal(exact.code, '00123');
assert.equal(String(BigInt(exact.id)), exact.id);
assert.throws(() => JSON.stringify({ id: BigInt(exact.id) }), TypeError);

assert.equal(JSON.parse('{"status":"draft","status":"published"}').status, 'published');
assert.throws(() => JSON.parse('{"active":false,}'), SyntaxError);
assert.equal(JSON.parse('{"active":false}').active, false);
assert.equal(Boolean('false'), true);
assert.equal(Object.hasOwn(JSON.parse('{"note":null}'), 'note'), true);
assert.equal(Object.hasOwn(JSON.parse('{}'), 'note'), false);

console.log('12 checks passed');
