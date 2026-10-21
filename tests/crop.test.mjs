import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../src/crop.js', import.meta.url), 'utf8'), context);
const { expression, rectangle } = context.CropMath, dimensions = { W: 1920, H: 1080 };
test('safe crop arithmetic preserves numeric and camera-relative crops', () => {
  assert.equal(expression(' W / 2 - 10 ', dimensions), 950);
  assert.equal(expression('(H + 440) / 2', dimensions), 760);
  assert.equal(expression('-2 * (3 + .5) + 1e2 / +4', dimensions), 18);
  assert.equal(expression('20/2/2-3-1', dimensions), 1);
  assert.deepEqual(Array.from(rectangle(['W/2-10', '(H+440)/2', '5e2', 400], dimensions)), [950, 760, 500, 400]);
  assert.deepEqual(Array.from(rectangle([-10, -20, 500, 400], dimensions)), [-10, -20, 500, 400]);
});
test('crop rejects code execution, properties, non-finite results and malformed input', () => {
  for (const value of ['globalThis.pwned=1', 'window.close()', 'W.constructor', '[]["constructor"]', 'Math.min(1,2)', '1;2', '1,2', '1/*x*/+2', '`${1}`', 'new Function("return 1")()', 'NaN', 'Infinity', '1/0', '0/0', '1e309', '1/(1/0)', '1e', '0x10', '1 2', '2**3', '()', '(1', '1)', 'W+', '', ' '.repeat(257), '('.repeat(33)+'1'+')'.repeat(33), null, {}, true, NaN, Infinity]) {
    assert.throws(() => expression(value, dimensions), /recorte/, String(value));
  }
  assert.equal(context.pwned, undefined);
  for (const values of [[1,2,0,4], [1,2,3,-4], [1,2,Infinity,4], [NaN,2,3,4], [1,2,3], null]) assert.throws(() => rectangle(values, dimensions), /recorte|Recorte/);
});
