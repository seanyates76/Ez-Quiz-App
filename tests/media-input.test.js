'use strict';

const fs = require('node:fs');
const path = require('node:path');

function read(rel){ return fs.readFileSync(path.resolve(__dirname, rel), 'utf8'); }

describe('Media Input (beta) UI stub', () => {
  const html = read('../public/index.html');
  test('has import button and file input', () => {
    expect(html).toMatch(/id=\"importBtn\"/);
    expect(html).toMatch(/id=\"importFile\"/);
  });
  test('file input accepts pdf and images', () => {
    expect(html).toMatch(/accept=\"[^\"]*application\/pdf[^\"]*\"/);
    expect(html).toMatch(/accept=\"[^\"]*image\/*[^\"]*\"/);
  });
});

