import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ALL_CASES, NOW, WORLD, fakeMatchMedia } from './visibility.cases';
import {
  checkClientCondition,
  childrenOf,
  evaluateLocally,
  isLogical,
  splitTree,
  type VisibilityCondition,
} from './visibility';

// Our engine against Home Assistant's own condition code (test/ha-frontend,
// fetched on demand by scripts/fetch-ha-conditions.mjs, pinned to an exact
// commit with a hash per file), on every
// case Home Assistant's code can run: each browser check, the first guess
// before the server answers, what is sent to the server, and the combined
// result once it answers (all true, all false, or not yet).

/**
 * Fetch (or reuse) Home Assistant's code, checked against the pin in
 * test/ha-frontend.lock.json. A mismatch fails this file. Offline with no
 * cached copy skips it, with a warning, except in CI (CI set), where it fails.
 */
const fetcher = await import(
  /* @vite-ignore */ new URL('../../scripts/fetch-ha-conditions.mjs', import.meta.url).href
);
let available = true;
let pinned = '';
try {
  const lock = await fetcher.ensureHaFrontend();
  pinned = `${lock.tag} (${String(lock.commit).slice(0, 12)})`;
} catch (err) {
  // In CI a skip would pass without testing parity, so there it fails instead.
  if (!(err instanceof fetcher.OfflineError) || process.env.CI) throw err;
  available = false;
  pinned = 'SKIPPED: offline, and no cached copy of the pinned code';
  process.stderr.write(
    `\nParity tests SKIPPED: Home Assistant's pinned code is not cached and ${String(err)}\n` +
      'Run npm run ha:conditions once online to fetch it.\n\n',
  );
}

/** Home Assistant's functions, loaded at run time so the type check stays out of their code. */
type Fn = (...args: any[]) => any;
let checkConditionsMet: Fn;
let evaluateConditionsLocally: Fn;
let splitConditionTree: Fn;

/** A module from the fetched Home Assistant frontend. */
const haModule = (path: string): Promise<Record<string, Fn>> =>
  import(/* @vite-ignore */ new URL(`../../test/ha-frontend/src/${path}.ts`, import.meta.url).href);

beforeAll(async () => {
  if (!available) return;
  ({ checkConditionsMet } = await haModule('panels/lovelace/common/validate-condition'));
  ({ evaluateConditionsLocally } = await haModule('common/condition/evaluate-locally'));
  ({ splitConditionTree } = await haModule('common/condition/split'));
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.stubGlobal('window', { matchMedia: fakeMatchMedia });
  vi.stubGlobal('matchMedia', fakeMatchMedia);
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const HASS = WORLD as never;

/** A check's outcome, or that it threw. */
const attempt = (run: () => boolean | undefined): boolean | undefined | 'throws' => {
  try {
    return run();
  } catch {
    return 'throws';
  }
};

const leavesOf = (list: VisibilityCondition[]): VisibilityCondition[] =>
  list.flatMap((c) =>
    isLogical(c) && Array.isArray(c.conditions) ? [c, ...leavesOf(childrenOf(c))] : [c],
  );

const comparable = ALL_CASES.filter((c) => c.haComparable !== false);

describe.skipIf(!available)(`parity with Home Assistant ${pinned}`, () => {
  it('covers most of the cases', () => {
    expect(comparable.length).toBeGreaterThan(ALL_CASES.length * 0.9);
  });

  describe.each(comparable.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    it('checks each condition the same in the browser', () => {
      for (const leaf of leavesOf(c.conditions)) {
        expect(
          attempt(() => checkClientCondition(leaf, WORLD)),
          JSON.stringify(leaf),
        ).toEqual(attempt(() => checkConditionsMet([leaf as never], HASS, {})));
      }
    });

    it('makes the same first guess before the server answers', () => {
      expect(evaluateLocally(c.conditions, WORLD)).toEqual(
        evaluateConditionsLocally(c.conditions as never, HASS, {}),
      );
    });

    it('sends Home Assistant the same subscriptions', () => {
      expect(splitTree(c.conditions).server.map((x) => x.condition)).toEqual(
        splitConditionTree(c.conditions as never).serverSubtrees.map(
          (x: { coreCondition: unknown }) => x.coreCondition,
        ),
      );
    });

    it('combines the same once the server answers', () => {
      const ours = splitTree(c.conditions);
      const theirs = splitConditionTree(c.conditions as never);
      const clientEvaluator = (leaf: unknown) => {
        try {
          return checkConditionsMet([leaf as never], HASS, {});
        } catch {
          return false;
        }
      };
      for (const answer of [true, false, undefined]) {
        const results = Object.fromEntries(ours.server.map((x) => [x.id, answer]));
        expect(ours.evaluate(WORLD, results), `server says ${String(answer)}`).toEqual(
          theirs.evaluate(clientEvaluator, results),
        );
      }
    });
  });
});
