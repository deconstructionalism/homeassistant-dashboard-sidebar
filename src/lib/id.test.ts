import { describe, expect, it } from 'vitest';

import { collectIds, generateId } from './id';

describe('generateId', () => {
  it('produces four-word dashed phrases', () => {
    expect(generateId(new Set())).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
  });

  it('never returns an id in the existing set, and records what it hands out', () => {
    const existing = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const id = generateId(existing);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      expect(existing.has(id)).toBe(true);
    }
  });
});

describe('collectIds', () => {
  it('walks regions, category items, and footer buttons', () => {
    const ids = collectIds({
      header: [{ id: 'a' }],
      body: [{ id: 'b', items: [{ id: 'c' }, {}] }, {}],
      footer: { buttons: [{ id: 'd' }] },
    });
    expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
