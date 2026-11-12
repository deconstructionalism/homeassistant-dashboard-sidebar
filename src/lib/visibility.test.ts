import { describe, expect, it } from 'vitest';

import { conditionMet, conditionsMet, type VisibilityContext } from './visibility';

/** A context: user u1, a few entity states, and a 1000px-wide screen. */
const ctx = (over: Partial<VisibilityContext> = {}): VisibilityContext => ({
  userId: 'u1',
  states: {
    'light.kitchen': { state: 'on' },
    'sensor.temp': { state: '21.5' },
    'sensor.text': { state: 'abc' },
  },
  matches: (q) => q === '(min-width: 800px)',
  ...over,
});

describe('user condition', () => {
  it('holds for a listed user id, and not for anyone else', () => {
    expect(conditionMet({ condition: 'user', users: ['u1', 'u2'] }, ctx())).toBe(true);
    expect(conditionMet({ condition: 'user', users: ['u2'] }, ctx())).toBe(false);
  });

  it('does not hold when the current user is unknown', () => {
    expect(conditionMet({ condition: 'user', users: ['u1'] }, ctx({ userId: undefined }))).toBe(
      false,
    );
  });
});

describe('screen condition', () => {
  it('follows the media query', () => {
    expect(conditionMet({ condition: 'screen', media_query: '(min-width: 800px)' }, ctx())).toBe(
      true,
    );
    expect(conditionMet({ condition: 'screen', media_query: '(max-width: 600px)' }, ctx())).toBe(
      false,
    );
  });
});

describe('state condition', () => {
  it('matches one state or any of a list', () => {
    expect(conditionMet({ condition: 'state', entity: 'light.kitchen', state: 'on' }, ctx())).toBe(
      true,
    );
    expect(
      conditionMet({ condition: 'state', entity: 'light.kitchen', state: ['off', 'on'] }, ctx()),
    ).toBe(true);
    expect(conditionMet({ condition: 'state', entity: 'light.kitchen', state: 'off' }, ctx())).toBe(
      false,
    );
  });

  it('honors state_not', () => {
    expect(
      conditionMet({ condition: 'state', entity: 'light.kitchen', state_not: 'off' }, ctx()),
    ).toBe(true);
    expect(
      conditionMet({ condition: 'state', entity: 'light.kitchen', state_not: ['on'] }, ctx()),
    ).toBe(false);
  });

  it('reads a missing entity as unavailable, as Home Assistant does', () => {
    expect(
      conditionMet({ condition: 'state', entity: 'light.gone', state: 'unavailable' }, ctx()),
    ).toBe(true);
    expect(conditionMet({ condition: 'state', entity: 'light.gone', state: 'on' }, ctx())).toBe(
      false,
    );
    expect(
      conditionMet({ condition: 'state', entity: 'light.gone', state_not: 'unavailable' }, ctx()),
    ).toBe(false);
  });
});

describe('numeric_state condition', () => {
  it('compares strictly above and below', () => {
    const t = (above?: number, below?: number) =>
      conditionMet({ condition: 'numeric_state', entity: 'sensor.temp', above, below }, ctx());
    expect(t(20)).toBe(true);
    expect(t(21.5)).toBe(false);
    expect(t(undefined, 22)).toBe(true);
    expect(t(20, 21)).toBe(false);
  });

  it('does not hold for a non-numeric or missing state', () => {
    expect(
      conditionMet({ condition: 'numeric_state', entity: 'sensor.text', above: 0 }, ctx()),
    ).toBe(false);
    expect(
      conditionMet({ condition: 'numeric_state', entity: 'sensor.gone', below: 100 }, ctx()),
    ).toBe(false);
  });
});

describe('and / or / not', () => {
  const yes = { condition: 'user' as const, users: ['u1'] };
  const no = { condition: 'user' as const, users: ['u9'] };

  it('and needs all, or needs any, not needs none', () => {
    expect(conditionMet({ condition: 'and', conditions: [yes, yes] }, ctx())).toBe(true);
    expect(conditionMet({ condition: 'and', conditions: [yes, no] }, ctx())).toBe(false);
    expect(conditionMet({ condition: 'or', conditions: [no, yes] }, ctx())).toBe(true);
    expect(conditionMet({ condition: 'or', conditions: [no, no] }, ctx())).toBe(false);
    expect(conditionMet({ condition: 'not', conditions: [no, no] }, ctx())).toBe(true);
    expect(conditionMet({ condition: 'not', conditions: [no, yes] }, ctx())).toBe(false);
  });

  it('nests', () => {
    expect(
      conditionMet(
        {
          condition: 'or',
          conditions: [
            no,
            { condition: 'and', conditions: [yes, { condition: 'not', conditions: [no] }] },
          ],
        },
        ctx(),
      ),
    ).toBe(true);
  });
});

describe('conditionsMet', () => {
  it('shows with no conditions, or an empty list', () => {
    expect(conditionsMet(undefined, ctx())).toBe(true);
    expect(conditionsMet([], ctx())).toBe(true);
  });

  it('needs every condition in the list', () => {
    const list = [
      { condition: 'user' as const, users: ['u1'] },
      { condition: 'screen' as const, media_query: '(min-width: 800px)' },
    ];
    expect(conditionsMet(list, ctx())).toBe(true);
    expect(conditionsMet(list, ctx({ userId: 'u2' }))).toBe(false);
  });

  it('never shows for an unknown condition type', () => {
    expect(conditionsMet([{ condition: 'location' } as never], ctx())).toBe(false);
  });
});
