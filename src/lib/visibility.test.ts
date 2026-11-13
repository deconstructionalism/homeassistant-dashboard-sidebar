import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkClientCondition,
  clock,
  conditionsMet,
  isServerCondition,
  isValidTimeString,
  msToNextBoundary,
  resolveTarget,
  splitTree,
  type ServerMessage,
  type VisibilityCondition,
  type VisibilityHass,
  VisibilityEvaluator,
} from './visibility';

// Parity with Home Assistant's card visibility (#4). Cases follow the
// frontend's validate-condition.ts, split.ts and check_time.ts.

const s = (state: string, attributes: Record<string, unknown> = {}) => ({ state, attributes });

const hass = (over: Partial<VisibilityHass> = {}): VisibilityHass => ({
  user: { id: 'u1' },
  states: {
    'light.kitchen': s('on', { brightness: 128 }),
    'sensor.temp': s('21.5', { target: 20 }),
    'sensor.text': s('abc'),
    'input_number.limit': s('25'),
    'input_select.mode': s('away'),
    'person.cron': s('home', { user_id: 'u1', in_zones: ['zone.home', 'zone.block'] }),
    'zone.home': s('1', { friendly_name: 'Home' }),
    'zone.work': s('0', { friendly_name: 'Work' }),
    'zone.block': s('1', { friendly_name: 'Block', passive: true }),
  },
  ...over,
});

const ok = (c: VisibilityCondition, h: VisibilityHass = hass()) => checkClientCondition(c, h);

describe('user', () => {
  it('holds for a listed id only, and never without a user', () => {
    expect(ok({ condition: 'user', users: ['u1', 'u2'] })).toBe(true);
    expect(ok({ condition: 'user', users: ['u2'] })).toBe(false);
    expect(ok({ condition: 'user', users: ['u1'] }, hass({ user: undefined }))).toBe(false);
  });
});

describe('screen', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q === '(min-width: 800px)' }),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('follows the media query; an empty one never holds', () => {
    expect(ok({ condition: 'screen', media_query: '(min-width: 800px)' })).toBe(true);
    expect(ok({ condition: 'screen', media_query: '(max-width: 600px)' })).toBe(false);
    expect(ok({ condition: 'screen', media_query: '' })).toBe(false);
  });
});

describe('state', () => {
  it('matches one state or any of a list, by entity or entity_id', () => {
    expect(ok({ condition: 'state', entity: 'light.kitchen', state: 'on' })).toBe(true);
    expect(ok({ condition: 'state', entity: 'light.kitchen', state: ['off', 'on'] })).toBe(true);
    expect(ok({ condition: 'state', entity: 'light.kitchen', state: 'off' })).toBe(false);
    expect(ok({ condition: 'state', entity_id: 'light.kitchen', state: 'on' })).toBe(true);
  });

  it('honors state_not', () => {
    expect(ok({ condition: 'state', entity: 'light.kitchen', state_not: 'off' })).toBe(true);
    expect(ok({ condition: 'state', entity: 'light.kitchen', state_not: ['on'] })).toBe(false);
  });

  it('reads a missing entity as unknown, as Home Assistant does', () => {
    expect(ok({ condition: 'state', entity: 'light.gone', state: 'unknown' })).toBe(true);
    expect(ok({ condition: 'state', entity: 'light.gone', state: 'unavailable' })).toBe(false);
    expect(ok({ condition: 'state', entity: 'light.gone', state_not: 'unknown' })).toBe(false);
  });

  it('reads an attribute, missing ones as unknown', () => {
    expect(
      ok({ condition: 'state', entity: 'light.kitchen', attribute: 'brightness', state: '128' }),
    ).toBe(true);
    expect(
      ok({ condition: 'state', entity: 'light.kitchen', attribute: 'nope', state: 'unknown' }),
    ).toBe(true);
  });

  it('compares against the state of an entity a value names', () => {
    // input_select.mode is "away"; a person-like entity in "away" matches
    const h = hass({ states: { ...hass().states, 'sensor.where': s('away') } });
    expect(ok({ condition: 'state', entity: 'sensor.where', state: 'input_select.mode' }, h)).toBe(
      true,
    );
    expect(ok({ condition: 'state', entity: 'light.kitchen', state: 'input_select.mode' }, h)).toBe(
      false,
    );
  });

  it('never holds with neither state nor state_not', () => {
    expect(ok({ condition: 'state', entity: 'light.kitchen' })).toBe(false);
  });

  it('accepts the legacy shape with no condition key', () => {
    expect(ok({ entity: 'light.kitchen', state: 'on' })).toBe(true);
    expect(ok({ entity: 'light.kitchen', state_not: 'on' })).toBe(false);
  });
});

describe('numeric_state', () => {
  const t = (above?: unknown, below?: unknown, extra: VisibilityCondition = {}) =>
    ok({ condition: 'numeric_state', entity: 'sensor.temp', above, below, ...extra });

  it('compares strictly above and below', () => {
    expect(t(20)).toBe(true);
    expect(t(21.5)).toBe(false);
    expect(t(undefined, 22)).toBe(true);
    expect(t(20, 21)).toBe(false);
  });

  it('takes a bound from an entity, and reads attributes', () => {
    expect(t(undefined, 'input_number.limit')).toBe(true);
    expect(t('input_number.limit')).toBe(false);
    expect(t(19, undefined, { attribute: 'target' })).toBe(true);
  });

  it('ignores a bound that is not a number', () => {
    expect(t('sensor.text')).toBe(true);
  });

  it('never holds for a non-numeric or missing state', () => {
    expect(ok({ condition: 'numeric_state', entity: 'sensor.text', above: 0 })).toBe(false);
    expect(ok({ condition: 'numeric_state', entity: 'sensor.gone', below: 100 })).toBe(false);
  });
});

describe('time', () => {
  // Thursday 2026-11-12 22:30:00 in the browser zone this suite runs in
  const at = (hh: number, mm: number, ss = 0) => {
    const d = new Date(2026, 10, 12, hh, mm, ss);
    vi.spyOn(clock, 'now').mockReturnValue(d);
    return d;
  };
  afterEach(() => vi.restoreAllMocks());

  it('checks after and before, before being exclusive', () => {
    at(22, 30);
    expect(ok({ condition: 'time', after: '22:00' })).toBe(true);
    expect(ok({ condition: 'time', after: '23:00' })).toBe(false);
    expect(ok({ condition: 'time', before: '22:30' })).toBe(false);
    expect(ok({ condition: 'time', after: '08:00', before: '23:00:00' })).toBe(true);
  });

  it('handles a window that crosses midnight', () => {
    at(22, 30);
    expect(ok({ condition: 'time', after: '22:00', before: '06:00' })).toBe(true);
    at(5, 0);
    expect(ok({ condition: 'time', after: '22:00', before: '06:00' })).toBe(true);
    at(12, 0);
    expect(ok({ condition: 'time', after: '22:00', before: '06:00' })).toBe(false);
  });

  it('checks weekdays', () => {
    at(12, 0);
    expect(ok({ condition: 'time', weekdays: ['thu'] })).toBe(true);
    expect(ok({ condition: 'time', weekdays: ['mon', 'fri'] })).toBe(false);
    expect(ok({ condition: 'time', weekdays: 'thu' })).toBe(true);
  });

  it('uses the server time zone when the profile says so', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2026-11-12T23:30:00Z'));
    const server = (tz: string) =>
      hass({ locale: { time_zone: 'server' }, config: { time_zone: tz } });
    expect(ok({ condition: 'time', after: '23:00' }, server('UTC'))).toBe(true);
    expect(ok({ condition: 'time', after: '23:00' }, server('America/New_York'))).toBe(false);
    // in New York it is already... no, still Thursday 18:30
    expect(ok({ condition: 'time', weekdays: ['thu'] }, server('America/New_York'))).toBe(true);
    expect(ok({ condition: 'time', weekdays: ['fri'] }, server('Asia/Tokyo'))).toBe(true);
  });

  it('validates time strings like Home Assistant', () => {
    expect(isValidTimeString('08:00')).toBe(true);
    expect(isValidTimeString('23:59:59')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('8')).toBe(false);
    expect(isValidTimeString('08:60')).toBe(false);
  });

  it('wakes at the next boundary, never later than midnight', () => {
    const now = at(22, 30, 0);
    const client = [{ condition: 'time', after: '22:45' }];
    expect(msToNextBoundary(client, hass(), now)).toBe(15 * 60 * 1000 + 50);
    const late = [{ condition: 'time', after: '08:00' }];
    expect(msToNextBoundary(late, hass(), now)).toBe(90 * 60 * 1000 + 50);
    expect(msToNextBoundary([{ condition: 'user' }], hass(), now)).toBe(undefined);
  });
});

describe('location', () => {
  it('matches locations and away', () => {
    expect(ok({ condition: 'location', locations: ['home'] })).toBe(true);
    expect(ok({ condition: 'location', locations: ['Work'] })).toBe(false);
    const away = hass({
      states: { ...hass().states, 'person.cron': s('not_home', { user_id: 'u1' }) },
    });
    expect(ok({ condition: 'location', away: true }, away)).toBe(true);
    expect(ok({ condition: 'location', away: true })).toBe(false);
  });

  it('never holds for a user with no person', () => {
    expect(ok({ condition: 'location', locations: ['home'] }, hass({ user: { id: 'u9' } }))).toBe(
      false,
    );
  });

  it('matches target zones: any zone the person is in, or only the active one', () => {
    const block = { condition: 'location', target: { entity_id: 'zone.block' } };
    expect(ok(block)).toBe(true);
    expect(ok({ ...block, match_mode: 'active_zone' })).toBe(false);
    expect(ok({ ...block, target: { entity_id: 'zone.home' }, match_mode: 'active_zone' })).toBe(
      true,
    );
    expect(ok({ ...block, target: { entity_id: 'zone.work' } })).toBe(false);
  });

  it('falls back to the active zone for a person with no in_zones', () => {
    const old = hass({ states: { ...hass().states, 'person.cron': s('Work', { user_id: 'u1' }) } });
    expect(ok({ condition: 'location', target: { entity_id: 'zone.work' } }, old)).toBe(true);
    expect(ok({ condition: 'location', target: { entity_id: 'zone.home' } }, old)).toBe(false);
  });

  it('resolves zones through labels, with exclude', () => {
    const h = hass({
      entities: { 'zone.home': { labels: ['mine'] }, 'zone.block': { labels: ['mine'] } },
    });
    const c = {
      condition: 'location',
      target: { label_id: 'mine', exclude: { entity_id: 'zone.block' } },
      match_mode: 'any_zone',
    };
    expect(ok(c, h)).toBe(true);
    expect(
      ok(
        { ...c, target: { label_id: 'mine', exclude: { entity_id: ['zone.block', 'zone.home'] } } },
        h,
      ),
    ).toBe(false);
  });
});

describe('resolveTarget', () => {
  const h = hass({
    floors: undefined,
    areas: { kitchen: { floor_id: 'ground' }, den: { floor_id: 'up', labels: ['cozy'] } },
    devices: {
      d1: { area_id: 'kitchen' },
      d2: { area_id: 'den' },
      hub: {},
      child: { parent_device_id: 'hub' },
    },
    entities: {
      'light.a': { device_id: 'd1' },
      'light.b': { device_id: 'd1', area_id: 'den' },
      'light.c': { area_id: 'kitchen' },
      'light.d': { device_id: 'd2' },
      'light.e': { device_id: 'child' },
      'light.f': { labels: ['cozy'] },
    },
  } as Partial<VisibilityHass>);
  const r = (t: Record<string, unknown>) => resolveTarget(h, t).sort();

  it('reaches area entities, but not a device entity assigned elsewhere', () => {
    expect(r({ area_id: 'kitchen' })).toEqual(['light.a', 'light.c']);
  });

  it('reaches every entity of a device named directly, and its child devices', () => {
    expect(r({ device_id: 'd1' })).toEqual(['light.a', 'light.b']);
    expect(r({ device_id: 'hub' })).toEqual(['light.e']);
  });

  it('reaches through floors and labels', () => {
    expect(r({ floor_id: 'ground' })).toEqual(['light.a', 'light.c']);
    expect(r({ label_id: 'cozy' })).toEqual(['light.b', 'light.d', 'light.f']);
  });
});

describe('and / or / not', () => {
  const yes = { condition: 'user', users: ['u1'] };
  const no = { condition: 'user', users: ['u9'] };
  const met = (c: VisibilityCondition) => conditionsMet([c], hass());

  it('and needs all, or needs any, not needs none', () => {
    expect(met({ condition: 'and', conditions: [yes, yes] })).toBe(true);
    expect(met({ condition: 'and', conditions: [yes, no] })).toBe(false);
    expect(met({ condition: 'or', conditions: [no, yes] })).toBe(true);
    expect(met({ condition: 'or', conditions: [no, no] })).toBe(false);
    expect(met({ condition: 'not', conditions: [no, no] })).toBe(true);
    expect(met({ condition: 'not', conditions: [yes, no] })).toBe(true);
    expect(met({ condition: 'not', conditions: [yes, yes] })).toBe(false);
  });

  it('takes a single condition in place of a list, and treats a missing list as holding', () => {
    expect(met({ condition: 'or', conditions: yes })).toBe(true);
    expect(met({ condition: 'and' })).toBe(true);
    expect(met({ condition: 'or' })).toBe(true);
  });

  it('nests', () => {
    expect(
      met({
        condition: 'or',
        conditions: [
          no,
          { condition: 'and', conditions: [yes, { condition: 'not', conditions: [no] }] },
        ],
      }),
    ).toBe(true);
  });

  it('skips conditions with enabled: false', () => {
    expect(conditionsMet([yes, { ...no, enabled: false }], hass())).toBe(true);
    expect(met({ condition: 'or', conditions: [{ ...yes, enabled: false }, no] })).toBe(false);
  });
});

describe('conditionsMet', () => {
  it('shows with no conditions, or an empty list', () => {
    expect(conditionsMet(undefined, hass())).toBe(true);
    expect(conditionsMet([], hass())).toBe(true);
  });

  it('treats view_columns as always holding (the sidebar has no column)', () => {
    expect(conditionsMet([{ condition: 'view_columns', min: 3 }], hass())).toBe(true);
  });

  it('counts a server condition as not holding without a connection', () => {
    expect(conditionsMet([{ condition: 'template', value_template: '{{ true }}' }], hass())).toBe(
      false,
    );
  });
});

describe('splitting between browser and server', () => {
  it('sends template, sun, zone, device, core state and integration conditions', () => {
    for (const c of [
      { condition: 'template', value_template: '{{ 1 }}' },
      { condition: 'sun', after: 'sunset' },
      { condition: 'zone', entity_id: 'person.cron', zone: 'zone.home' },
      { condition: 'device', device_id: 'd1', domain: 'light', type: 'is_on' },
      { condition: 'state', entity_id: 'light.kitchen', state: 'on', for: '00:05:00' },
      { condition: 'numeric_state', entity_id: 'sensor.temp', above: 20 },
      { condition: 'some_integration.thing' },
    ]) {
      expect(isServerCondition(c), c.condition).toBe(true);
    }
  });

  it('keeps the browser ones here', () => {
    for (const c of [
      { condition: 'user', users: [] },
      { condition: 'screen', media_query: 'x' },
      { condition: 'time' },
      { condition: 'location' },
      { condition: 'view_columns' },
      { condition: 'state', entity: 'light.kitchen', state: 'on' },
      { entity: 'light.kitchen', state: 'on' },
    ]) {
      expect(isServerCondition(c), String(c.condition)).toBe(false);
    }
  });

  it('merges server siblings into one subscription, keeping client ones here', () => {
    const split = splitTree([
      { condition: 'template', value_template: '{{ a }}' },
      { condition: 'user', users: ['u1'] },
      { condition: 'sun', after: 'sunset' },
      {
        condition: 'or',
        conditions: [
          { condition: 'template', value_template: '{{ b }}' },
          { condition: 'time', after: '08:00' },
        ],
      },
    ]);
    expect(split.server.map((x) => x.condition)).toEqual(
      expect.arrayContaining([
        {
          condition: 'and',
          conditions: [
            { condition: 'template', value_template: '{{ a }}' },
            { condition: 'sun', after: 'sunset' },
          ],
        },
        { condition: 'template', value_template: '{{ b }}' },
      ]),
    );
    expect(split.server).toHaveLength(2);
    expect(split.client.map((c) => c.condition)).toEqual(['user', 'time']);
  });

  it('sends an all-server group whole, and a templated enabled to the server', () => {
    const group = { condition: 'not', conditions: [{ condition: 'sun', before: 'sunrise' }] };
    expect(splitTree([group]).server[0].condition).toEqual(group);
    const templated = { condition: 'user', users: ['u1'], enabled: '{{ true }}' };
    expect(splitTree([templated]).server[0].condition).toEqual(templated);
  });

  it('is unknown until the server answers, then combines', () => {
    const split = splitTree([
      { condition: 'user', users: ['u1'] },
      { condition: 'template', value_template: '{{ x }}' },
    ]);
    expect(split.evaluate(hass(), {})).toBe(undefined);
    expect(split.evaluate(hass(), { 0: true })).toBe(true);
    expect(split.evaluate(hass(), { 0: false })).toBe(false);
    // a known false elsewhere decides it without waiting
    expect(split.evaluate(hass({ user: { id: 'u9' } }), {})).toBe(false);
  });
});

describe('VisibilityEvaluator', () => {
  /** A connection that records subscriptions and lets the test push results. */
  const fakeConnection = () => {
    const subs: Array<{
      msg: Record<string, unknown>;
      push: (m: ServerMessage) => void;
      closed: boolean;
    }> = [];
    return {
      subs,
      connection: {
        subscribeMessage: (push: (m: ServerMessage) => void, msg: Record<string, unknown>) => {
          const sub = { msg, push, closed: false };
          subs.push(sub);
          return Promise.resolve(() => {
            sub.closed = true;
          });
        },
      },
    };
  };
  const tpl = [{ condition: 'template', value_template: '{{ x }}' }];

  it('subscribes once, follows pushes, and treats an error as false', () => {
    const { subs, connection } = fakeConnection();
    const onChange = vi.fn();
    const e = new VisibilityEvaluator(onChange);
    expect(e.observe(tpl, hass({ connection }))).toBe(undefined);
    expect(subs).toHaveLength(1);
    expect(subs[0].msg).toEqual({ type: 'subscribe_condition', condition: tpl[0] });
    subs[0].push({ result: true });
    expect(e.result).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    subs[0].push({ error: 'bad template' });
    expect(e.result).toBe(false);
    e.observe(tpl, hass({ connection }));
    expect(subs, 'no resubscribe for the same conditions').toHaveLength(1);
  });

  it('resubscribes when the conditions or the connection change, closing the old one', async () => {
    const a = fakeConnection();
    const b = fakeConnection();
    const e = new VisibilityEvaluator(() => undefined);
    e.observe(tpl, hass({ connection: a.connection }));
    e.observe([{ condition: 'sun', after: 'sunset' }], hass({ connection: a.connection }));
    e.observe([{ condition: 'sun', after: 'sunset' }], hass({ connection: b.connection }));
    await Promise.resolve();
    await Promise.resolve();
    expect(a.subs.map((x) => x.closed)).toEqual([true, true]);
    expect(b.subs).toHaveLength(1);
    a.subs[1].push({ result: true });
    expect(e.result, 'a closed subscription is ignored').toBe(undefined);
  });

  it('opens no subscription for browser-only conditions', () => {
    const { subs, connection } = fakeConnection();
    const e = new VisibilityEvaluator(() => undefined);
    expect(e.observe([{ condition: 'user', users: ['u1'] }], hass({ connection }))).toBe(true);
    expect(subs).toHaveLength(0);
  });

  it('skips the re-check when nothing the conditions read has changed', () => {
    const e = new VisibilityEvaluator(() => undefined);
    const conds = [{ condition: 'state', entity: 'light.kitchen', state: 'on' }];
    const h = hass();
    expect(e.observe(conds, h)).toBe(true);
    // a new hass whose kitchen light is the same object: result kept
    const unrelated = { ...h, states: { ...h.states, 'sensor.temp': s('30') } };
    expect(e.observe(conds, unrelated)).toBe(true);
    const off = { ...h, states: { ...h.states, 'light.kitchen': s('off') } };
    expect(e.observe(conds, off)).toBe(false);
  });

  it('wakes itself at a time boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 12, 21, 59, 59));
    const onChange = vi.fn();
    const e = new VisibilityEvaluator(onChange);
    expect(e.observe([{ condition: 'time', after: '22:00' }], hass())).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(e.result).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    e.dispose();
    vi.useRealTimers();
  });
});
