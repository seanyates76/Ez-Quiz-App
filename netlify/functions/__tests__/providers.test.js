'use strict';

const {
  buildStructuredPrompt,
  callProvider,
  generateLines,
} = require('../lib/providers.js');

describe('providers helpers', () => {
  test('buildStructuredPrompt requests minified JSON schema', () => {
    const out = buildStructuredPrompt('History', 3, ['MC','YN'], 'hard');
    expect(out).toMatch(/structured quiz about History/);
    expect(out).toMatch(/Allowed question types: MC, YN/);
    expect(out).toMatch(/Respond with valid minified JSON only/);
    expect(out).toMatch(/Include exactly 3 questions/);
    expect(out).toMatch(/"type": "MC" \| "TF" \| "YN" \| "MT"/);
  });

  test('callProvider echo returns stub text', async () => {
    const { text, provider, model } = await callProvider({ provider: 'echo', topic: 'Biology', count: 3, env: {} });
    expect(provider).toBe('echo');
    expect(model).toBe('stub');
    expect(text.split('\n')).toHaveLength(3);
  });

  test('generateLines echo normalizes to requested count', async () => {
    const { title, lines, provider } = await generateLines({ provider: 'echo', topic: 'Chemistry', count: 5, env: {} });
    expect(provider).toBe('echo');
    expect(typeof title).toBe('string');
    const l = String(lines).trim().split('\n');
    expect(l).toHaveLength(5);
  });
});
