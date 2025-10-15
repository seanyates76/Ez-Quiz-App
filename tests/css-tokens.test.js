const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.resolve(__dirname, file), 'utf8');
}

describe('public/styles.css core tokens', () => {
  const css = read('../public/styles.css');
  test('has --field and --text tokens', () => {
    expect(css).toMatch(/--field/);
    expect(css).toMatch(/--text/);
  });
  test('has --radius-card token', () => {
    expect(css).toMatch(/--radius-card/);
  });
});

