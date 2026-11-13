import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ALL_CASES, NOW, WORLD, fakeMatchMedia } from './visibility.cases';
import { visibilityErrors } from './validate';
import { evaluateLocally, splitTree } from './visibility';

// Snapshots of what the linter says about every case, and what the engine
// makes of it at the fixed moment: the local result, what goes to Home
// Assistant, and the outcome once it answers all true or all false. Any
// change to validation or evaluation shows up as a snapshot diff to review.
// Update deliberately with: npx vitest run -u src/lib/visibility.lint.test.ts

beforeAll(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.stubGlobal('window', { matchMedia: fakeMatchMedia });
  vi.stubGlobal('matchMedia', fakeMatchMedia);
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('visibility linting and evaluation', () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const split = splitTree(c.conditions);
    const all = (value: boolean) => Object.fromEntries(split.server.map((x) => [x.id, value]));
    expect({
      conditions: c.conditions,
      lint: visibilityErrors(c.conditions),
      local: evaluateLocally(c.conditions, WORLD) ?? 'unknown',
      sentToHomeAssistant: split.server.map((x) => x.condition),
      ifHomeAssistantSaysTrue: split.evaluate(WORLD, all(true)) ?? 'unknown',
      ifHomeAssistantSaysFalse: split.evaluate(WORLD, all(false)) ?? 'unknown',
    }).toMatchSnapshot();
  });
});
