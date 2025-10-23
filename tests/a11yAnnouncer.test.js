'use strict';

const { loadBrowserModule } = require('./utils');

describe('a11y announcer', () => {
  let announce;

  beforeAll(() => {
    ({ announce } = loadBrowserModule('public/js/a11y-announcer.js', ['announce']));
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('creates live region and announces message', (done) => {
    announce('Test message', 'polite');
    setTimeout(() => {
      const region = document.getElementById('ez-quiz-a11y-live-region');
      expect(region).toBeTruthy();
      expect(region.textContent).toBe('Test message');
      expect(region.getAttribute('aria-live')).toBe('polite');
      done();
    }, 20);
  });
});

