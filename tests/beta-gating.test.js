'use strict';

describe('beta gating helper', () => {
  afterEach(() => {
    delete global.document;
  });

  test('returns true when settings flag is enabled', async () => {
    const { isBetaEnabled } = await import('../public/js/beta.mjs');
    expect(isBetaEnabled({ betaEnabled: true })).toBe(true);
  });

  test('returns true when data-beta attribute is present', async () => {
    const { isBetaEnabled } = await import('../public/js/beta.mjs');
    global.document = { body: { hasAttribute: () => false, dataset: { beta: '' } } };
    expect(isBetaEnabled({ betaEnabled: false })).toBe(true);
  });

  test('returns false when beta is disabled everywhere', async () => {
    const { isBetaEnabled } = await import('../public/js/beta.mjs');
    expect(isBetaEnabled({ betaEnabled: false })).toBe(false);
  });
});
