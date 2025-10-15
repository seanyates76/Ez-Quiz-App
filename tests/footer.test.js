'use strict';

const fs = require('node:fs');
const path = require('node:path');

function read(rel){ return fs.readFileSync(path.resolve(__dirname, rel), 'utf8'); }

describe('Footer makeover', () => {
  const html = read('../public/index.html');

  test('footer nav exists', () => {
    expect(html).toMatch(/<nav aria-label=\"Footer\">/);
  });

  test('footer-links row present with required links', () => {
    expect(html).toMatch(/class=\"footer-links\"/);
    expect(html).toMatch(/id=\"privacyLink\"/);
    expect(html).toMatch(/id=\"termsLink\"/);
  });

  test('support-cta present', () => {
    expect(html).toMatch(/class=\"support-cta\"/);
    expect(html).toMatch(/cdn\.buymeacoffee\.com/);
  });
});

