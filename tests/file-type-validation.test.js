'use strict';
const { Blob: NodeBlob } = require('buffer');

const { loadBrowserModule } = require('./utils');

describe('file type validation', () => {
  let sniffFileKind;
  let isSupportedImportKind;

  beforeAll(() => {
    ({ sniffFileKind, isSupportedImportKind } = loadBrowserModule('public/js/file-type-validation.js', ['sniffFileKind', 'isSupportedImportKind']));
  });

  const fromHex = (hex) => {
    const pairs = hex.match(/.{1,2}/g) || [];
    return Uint8Array.from(pairs.map((pair) => parseInt(pair, 16)));
  };

  const makeBlob = (hex) => new NodeBlob([fromHex(hex)]);

  test('detects pdf headers', async () => {
    const blob = makeBlob('255044462d312e350a00'); // %PDF-1.5\n
    await expect(sniffFileKind(blob)).resolves.toBe('pdf');
  });

  test('detects png headers', async () => {
    const blob = makeBlob('89504e470d0a1a0a00');
    await expect(sniffFileKind(blob)).resolves.toBe('png');
  });

  test('detects jpeg headers', async () => {
    const blob = makeBlob('ffd8ffe000104a46494600');
    await expect(sniffFileKind(blob)).resolves.toBe('jpeg');
  });

  test('detects gif headers', async () => {
    const blob = makeBlob('47494638396126002600');
    await expect(sniffFileKind(blob)).resolves.toBe('gif');
  });

  test('returns unknown for unsupported bytes', async () => {
    const blob = makeBlob('0001020304050607');
    await expect(sniffFileKind(blob)).resolves.toBe('unknown');
  });

  test('isSupportedImportKind flags supported values', () => {
    expect(isSupportedImportKind('pdf')).toBe(true);
    expect(isSupportedImportKind('png')).toBe(true);
    expect(isSupportedImportKind('jpeg')).toBe(true);
    expect(isSupportedImportKind('gif')).toBe(true);
    expect(isSupportedImportKind('bmp')).toBe(false);
  });
});
