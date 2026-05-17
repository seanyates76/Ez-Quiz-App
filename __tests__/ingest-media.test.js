'use strict';

const { _internals } = require('../netlify/functions/ingest-media.js');

if (typeof global.setImmediate !== 'function') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

function basePayload(overrides = {}) {
  const text = Buffer.from('Study term: Photosynthesis\nDefinition: Plants convert light to energy.', 'utf8');
  return {
    name: 'notes.txt',
    type: 'text/plain',
    kind: 'txt',
    size: text.length,
    data: text.toString('base64'),
    ...overrides,
  };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

describe('ingest-media helpers', () => {
  beforeEach(() => {
    _internals.clearRateLimit();
  });

  test('normalizes readable text payloads', () => {
    const file = _internals.normalizePayload(basePayload());

    expect(file.kind).toBe('txt');
    expect(file.type).toBe('text/plain');
    expect(file.name).toBe('notes.txt');
    expect(file.buffer.toString('utf8')).toContain('Photosynthesis');
  });

  test('rejects binary content declared as text', () => {
    const data = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0x00]);

    expect(() => _internals.normalizePayload(basePayload({
      name: 'notes.txt',
      type: 'text/plain',
      kind: 'txt',
      size: data.length,
      data: data.toString('base64'),
    }))).toThrow(/readable text/);
  });

  test('rejects binary payloads whose metadata conflicts with contents', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    expect(() => _internals.normalizePayload(basePayload({
      name: 'photo.jpg',
      type: 'image/jpeg',
      kind: 'jpeg',
      size: pngHeader.length,
      data: pngHeader.toString('base64'),
    }))).toThrow(/match its contents/);
  });

  test('extracts deterministic UTF-16 text', async () => {
    const data = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('Alpha\r\nBeta', 'utf16le'),
    ]);
    const file = _internals.normalizePayload(basePayload({
      name: 'utf16.txt',
      type: 'text/plain',
      kind: 'txt',
      size: data.length,
      data: data.toString('base64'),
    }));

    await expect(_internals.extractDeterministicText(file)).resolves.toMatchObject({
      text: 'Alpha\nBeta',
      provider: 'deterministic',
      model: 'txt',
    });
  });

  test('extracts deterministic DOCX document text', async () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<w:document><w:body>',
      '<w:p><w:r><w:t>Chapter One</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>Key term &amp; definition</w:t></w:r></w:p>',
      '</w:body></w:document>',
    ].join('');
    const docx = makeZip([['word/document.xml', xml]]);
    const file = _internals.normalizePayload(basePayload({
      name: 'notes.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      kind: 'docx',
      size: docx.length,
      data: docx.toString('base64'),
    }));

    await expect(_internals.extractDeterministicText(file)).resolves.toMatchObject({
      text: 'Chapter One\nKey term & definition',
      provider: 'deterministic',
      model: 'docx',
    });
  });

  test('prunes stale rate-limit keys when the limiter map grows', () => {
    const originalNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      for (let i = 0; i < 505; i += 1) {
        _internals.rateLimited({ headers: { 'x-forwarded-for': `2001:db8::${i}` } });
      }
      expect(_internals.rateLimitSize()).toBeGreaterThan(500);

      now += 16 * 60 * 1000;
      _internals.rateLimited({ headers: { 'x-forwarded-for': '2001:db8::fresh' } });

      expect(_internals.rateLimitSize()).toBe(1);
    } finally {
      Date.now = originalNow;
    }
  });
});
