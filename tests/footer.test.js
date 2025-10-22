/** @jest-environment jsdom */
'use strict';

const { loadDocument } = require('./utils');

describe('Footer makeover', () => {
  let document;
  let footer;

  beforeAll(async () => {
    document = await loadDocument('public/index.html');
    footer = document.querySelector('footer[role="contentinfo"]');
  });

  test('footer nav exists', () => {
    expect(footer).not.toBeNull();
    const nav = footer.querySelector('nav[aria-label="Footer"]');
    expect(nav).not.toBeNull();
  });

  test('footer-links row present with required links', () => {
    const linksRow = footer.querySelector('.footer-links');
    expect(linksRow).not.toBeNull();

    const privacy = footer.querySelector('#privacyLink');
    const terms = footer.querySelector('#termsLink');
    expect(privacy).not.toBeNull();
    expect(terms).not.toBeNull();
    expect(privacy.getAttribute('role')).toBe('listitem');
    expect(terms.getAttribute('role')).toBe('listitem');
  });

  test('support-cta present with external link safeguards', () => {
    const supportCta = footer.querySelector('.support-cta');
    expect(supportCta).not.toBeNull();

    const anchor = supportCta.querySelector('a#bmcButton');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toContain('buymeacoffee');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toContain('noopener');
  });
});
