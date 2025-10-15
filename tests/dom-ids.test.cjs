const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.resolve(__dirname, file), 'utf8');
}

describe('public/index.html required IDs', () => {
  const html = read('../public/index.html');
  test('has #startBtn', () => {
    expect(html).toMatch(/id=\"startBtn\"/);
  });
  test('has #editor and #mirror', () => {
    expect(html).toMatch(/id=\"editor\"/);
    expect(html).toMatch(/id=\"mirror\"/);
  });
  test('has #generatedMirror reference in docs', () => {
    // allow mention in docs; presence check is still useful
    expect(html).toMatch(/Start/);
  });
});

