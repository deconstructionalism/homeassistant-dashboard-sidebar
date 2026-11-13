/**
 * The visibility test cases, shared by the linting snapshots
 * (visibility.lint.test.ts), the parity check against Home Assistant's own
 * code (visibility.parity.test.ts) and the editor's UI snapshots
 * (editor/visibility-tab.snapshot.browser.test.ts): a fixed house, a fixed
 * moment, and every permutation of each condition's fields, plus and / or /
 * not combinations.
 */
import type { VisibilityCondition, VisibilityHass } from './visibility';

/** The fixed moment: Thursday 2026-11-12, 22:30:00.000 in New York. */
export const NOW = new Date('2026-11-13T03:30:00.000Z');

/** The server's time zone; the world uses it (`locale.time_zone: server`). */
export const TIME_ZONE = 'America/New_York';

/** A state object with its entity id, as Home Assistant sends it. */
const s = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) => ({
  entity_id,
  state,
  attributes,
});

const STATES = [
  s('person.cron', 'home', {
    user_id: 'u1',
    friendly_name: 'Cron',
    in_zones: ['zone.home', 'zone.block'],
  }),
  s('person.sam', 'Work', { user_id: 'u2', friendly_name: 'Sam', in_zones: ['zone.work'] }),
  s('zone.home', '1', { friendly_name: 'Home' }),
  s('zone.work', '1', { friendly_name: 'Work' }),
  s('zone.block', '1', { friendly_name: 'Block', passive: true }),
  s('light.kitchen', 'on', { friendly_name: 'Kitchen', brightness: 128, mode: 'away' }),
  s('light.hall', 'off', { friendly_name: 'Hall' }),
  s('sensor.temp', '21.5', { friendly_name: 'Temperature', target: 20, nothing: null }),
  s('sensor.text', 'abc'),
  s('sensor.empty', ''),
  s('sensor.five', '5'),
  s('input_number.limit', '25'),
  s('input_select.mode', 'away'),
];

/** The house, with the registry fields Home Assistant's own code reads. */
const world = {
  user: { id: 'u1', name: 'Cron' },
  locale: { time_zone: 'server' },
  config: { time_zone: TIME_ZONE },
  states: Object.fromEntries(STATES.map((x) => [x.entity_id, x])),
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', floor_id: 'ground', labels: [] },
    den: { area_id: 'den', name: 'Den', floor_id: 'up', labels: ['cozy'] },
  },
  devices: {
    d1: { id: 'd1', area_id: 'kitchen', labels: [], parent_device_id: null },
    hub: { id: 'hub', name: 'Zone Hub', area_id: null, labels: ['zones'], parent_device_id: null },
    child: { id: 'child', area_id: null, labels: [], parent_device_id: 'hub' },
    denbox: { id: 'denbox', area_id: 'den', labels: [], parent_device_id: null },
  },
  entities: {
    'zone.home': { entity_id: 'zone.home', labels: ['mine'], area_id: null, device_id: null },
    'zone.work': { entity_id: 'zone.work', labels: [], area_id: 'den', device_id: null },
    'zone.block': { entity_id: 'zone.block', labels: ['mine'], area_id: null, device_id: 'child' },
    'zone.reloading': {
      entity_id: 'zone.reloading',
      labels: ['mine'],
      area_id: null,
      device_id: null,
    },
    'light.kitchen': { entity_id: 'light.kitchen', labels: [], area_id: null, device_id: 'd1' },
  },
};

/** The fixed house: two people, three zones, a few entities and the registries. */
export const WORLD: VisibilityHass = world;

/** One case: a name and a condition list. */
export interface VisibilityCase {
  /** Unique, readable, and the snapshot key. */
  name: string;
  /** The `visibility:` list. */
  conditions: VisibilityCondition[];
  /** Whether Home Assistant's frontend code can run it (it throws on some shapes we accept). */
  haComparable?: boolean;
}

const one = (
  name: string,
  condition: VisibilityCondition,
  haComparable = true,
): VisibilityCase => ({
  name,
  conditions: [condition],
  haComparable,
});

/** Every permutation of each condition type's fields. */
export const SINGLE_CASES: VisibilityCase[] = [
  // user
  one('user: me', { condition: 'user', users: ['u1'] }),
  one('user: someone else', { condition: 'user', users: ['u2'] }),
  one('user: me among others', { condition: 'user', users: ['u2', 'u1'] }),
  one('user: nobody chosen', { condition: 'user', users: [] }),
  one('user: no users key', { condition: 'user' }),
  // screen (the browser's 800px-wide test viewport; matchMedia is stubbed the same in node)
  one('screen: matches', { condition: 'screen', media_query: '(min-width: 1px)' }),
  one('screen: does not match', { condition: 'screen', media_query: '(max-width: 1px)' }),
  one('screen: empty query', { condition: 'screen', media_query: '' }),
  one('screen: no query', { condition: 'screen' }),
  // time, at Thursday 22:30:00 server time
  one('time: after, passed', { condition: 'time', after: '22:00' }),
  one('time: after, not yet', { condition: 'time', after: '23:00' }),
  one('time: after, exactly now', { condition: 'time', after: '22:30' }),
  one('time: after, with seconds', { condition: 'time', after: '22:29:59' }),
  one('time: before, exactly now (inclusive)', { condition: 'time', before: '22:30' }),
  one('time: before, just passed', { condition: 'time', before: '22:29:59' }),
  one('time: before, ahead', { condition: 'time', before: '23:00' }),
  one('time: window, inside', { condition: 'time', after: '08:00', before: '23:00' }),
  one('time: window, outside', { condition: 'time', after: '08:00', before: '22:00' }),
  one('time: overnight, inside', { condition: 'time', after: '22:00', before: '06:00' }),
  one('time: overnight, outside', { condition: 'time', after: '23:00', before: '06:00' }),
  one('time: same time both ends', { condition: 'time', after: '22:30', before: '22:30' }),
  one('time: today', { condition: 'time', weekdays: ['thu'] }),
  one('time: other days', { condition: 'time', weekdays: ['mon', 'fri'] }),
  one('time: today in the window', {
    condition: 'time',
    after: '22:00',
    weekdays: ['thu', 'fri'],
  }),
  one('time: overnight starting tomorrow', {
    condition: 'time',
    after: '22:00',
    before: '06:00',
    weekdays: ['fri'],
  }),
  one('time: no fields', { condition: 'time' }),
  one('time: not a time', { condition: 'time', after: '25:00' }, false),
  // location (Cron is home, in zone.home and the passive zone.block)
  one('location: home', { condition: 'location', locations: ['home'] }),
  one('location: elsewhere', { condition: 'location', locations: ['Work'] }),
  one('location: away (not away)', { condition: 'location', away: true }),
  one('location: home or away', { condition: 'location', locations: ['home'], away: true }),
  one('location: zone, any', {
    condition: 'location',
    target: { entity_id: 'zone.block' },
  }),
  one('location: zone, active only', {
    condition: 'location',
    target: { entity_id: 'zone.block' },
    match_mode: 'active_zone',
  }),
  one('location: home zone, active only', {
    condition: 'location',
    target: { entity_id: ['zone.home'] },
    match_mode: 'active_zone',
  }),
  one('location: another zone', { condition: 'location', target: { entity_id: 'zone.work' } }),
  one('location: zones by label', { condition: 'location', target: { label_id: 'mine' } }),
  one('location: zones by label, less one', {
    condition: 'location',
    target: { label_id: 'mine', exclude: { entity_id: ['zone.home', 'zone.block'] } },
  }),
  one('location: zone by area', { condition: 'location', target: { area_id: 'den' } }),
  one('location: zone by floor', { condition: 'location', target: { floor_id: 'up' } }),
  one('location: zone by parent device', { condition: 'location', target: { device_id: 'hub' } }),
  one('location: zone by labelled device (no children)', {
    condition: 'location',
    target: { label_id: 'zones' },
  }),
  one('location: empty target', { condition: 'location', target: {} }),
  one('location: target not a mapping', { condition: 'location', target: 'zone.home' }),
  one('location: places and target', {
    condition: 'location',
    locations: ['Work'],
    target: { entity_id: 'zone.home' },
  }),
  one('location: nothing', { condition: 'location' }),
  // state
  one('state: is', { condition: 'state', entity: 'light.kitchen', state: 'on' }),
  one('state: is not', { condition: 'state', entity: 'light.kitchen', state: 'off' }),
  one('state: any of', { condition: 'state', entity: 'light.kitchen', state: ['off', 'on'] }),
  one('state: state_not', { condition: 'state', entity: 'light.kitchen', state_not: 'off' }),
  one('state: state_not list', {
    condition: 'state',
    entity: 'light.kitchen',
    state_not: ['on', 'idle'],
  }),
  one('state: both, state wins', {
    condition: 'state',
    entity: 'light.kitchen',
    state: 'on',
    state_not: 'on',
  }),
  one('state: attribute as text', {
    condition: 'state',
    entity: 'light.kitchen',
    attribute: 'brightness',
    state: '128',
  }),
  one('state: attribute as a number', {
    condition: 'state',
    entity: 'light.kitchen',
    attribute: 'brightness',
    state: 128,
  }),
  one('state: missing attribute is unknown', {
    condition: 'state',
    entity: 'light.kitchen',
    attribute: 'nope',
    state: 'unknown',
  }),
  one('state: missing entity is unknown', {
    condition: 'state',
    entity: 'light.gone',
    state: 'unknown',
  }),
  one('state: missing entity, state_not', {
    condition: 'state',
    entity: 'light.gone',
    state_not: 'on',
  }),
  one('state: value names an entity', {
    condition: 'state',
    entity: 'light.kitchen',
    attribute: 'mode',
    state: 'input_select.mode',
  }),
  one('state: value names a missing entity', {
    condition: 'state',
    entity: 'light.kitchen',
    state: 'input_select.gone',
  }),
  one('state: a number value', { condition: 'state', entity: 'sensor.five', state: 5 }),
  one('state: entity_id form', { condition: 'state', entity_id: 'light.kitchen', state: 'on' }),
  one('state: entity_id form, for', {
    condition: 'state',
    entity_id: 'light.kitchen',
    state: 'on',
    for: '00:05:00',
  }),
  one('state: legacy shape', { entity: 'light.kitchen', state: 'on' }),
  one('state: legacy shape, state_not', { entity: 'light.hall', state_not: 'off' }),
  one('state: no value', { condition: 'state', entity: 'light.kitchen' }),
  one('state: no entity', { condition: 'state', state: 'on' }),
  // numeric_state (sensor.temp is 21.5)
  one('numeric: above', { condition: 'numeric_state', entity: 'sensor.temp', above: 20 }),
  one('numeric: above, equal (strict)', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: 21.5,
  }),
  one('numeric: below', { condition: 'numeric_state', entity: 'sensor.temp', below: 22 }),
  one('numeric: between', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: 20,
    below: 22,
  }),
  one('numeric: outside', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: 22,
    below: 30,
  }),
  one('numeric: numeric text bound', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: '20',
  }),
  one('numeric: bound names an entity', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    below: 'input_number.limit',
  }),
  one('numeric: lower bound names an entity', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: 'input_number.limit',
  }),
  one('numeric: junk bound ignored', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    above: 'abc',
  }),
  one('numeric: attribute', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    attribute: 'target',
    above: 19,
  }),
  one('numeric: null attribute reads as 0', {
    condition: 'numeric_state',
    entity: 'sensor.temp',
    attribute: 'nothing',
    above: -1,
  }),
  one('numeric: not a number', { condition: 'numeric_state', entity: 'sensor.text', above: 0 }),
  one('numeric: empty state reads as 0', {
    condition: 'numeric_state',
    entity: 'sensor.empty',
    above: -1,
  }),
  one('numeric: missing entity', {
    condition: 'numeric_state',
    entity: 'sensor.gone',
    below: 100,
  }),
  one('numeric: no bounds', { condition: 'numeric_state', entity: 'sensor.temp' }),
  one('numeric: entity_id form', {
    condition: 'numeric_state',
    entity_id: 'sensor.temp',
    above: 20,
  }),
  // server-only types
  one('template', { condition: 'template', value_template: '{{ true }}' }),
  one('template: empty', { condition: 'template' }),
  one('sun: after sunset', { condition: 'sun', after: 'sunset', after_offset: '-01:00:00' }),
  one('sun: bad value', { condition: 'sun', after: 'noon' }),
  one('sun: nothing', { condition: 'sun' }),
  one('zone', { condition: 'zone', entity_id: 'person.cron', zone: 'zone.home' }),
  one('zone: no zone', { condition: 'zone', entity_id: 'person.cron' }),
  one('device', { condition: 'device', device_id: 'd1', domain: 'light', type: 'is_on' }),
  one('device: incomplete', { condition: 'device', device_id: 'd1' }),
  one('integration condition', { condition: 'some_integration.thing', option: 1 }),
  one('view_columns', { condition: 'view_columns', min: 2 }),
  // switches
  one('turned off', { condition: 'user', users: ['u2'], enabled: false }),
  one('templated enabled', { condition: 'user', users: ['u1'], enabled: '{{ true }}' }),
];

const T: VisibilityCondition = { condition: 'user', users: ['u1'] };
const F: VisibilityCondition = { condition: 'user', users: ['u2'] };
/** A condition only the server can answer. */
const S: VisibilityCondition = { condition: 'template', value_template: '{{ x }}' };
const S2: VisibilityCondition = { condition: 'sun', after: 'sunset' };
const OFF = (c: VisibilityCondition): VisibilityCondition => ({ ...c, enabled: false });
const g = (
  op: 'and' | 'or' | 'not',
  ...conditions: VisibilityCondition[]
): VisibilityCondition => ({ condition: op, conditions });

const many = (name: string, conditions: VisibilityCondition[], haComparable = true) => ({
  name,
  conditions,
  haComparable,
});

/** and / or / not, alone, nested, mixed with server conditions and switches. */
export const COMBINATOR_CASES: VisibilityCase[] = [
  // truth tables on two children
  ...(['and', 'or', 'not'] as const).flatMap((op) =>
    (
      [
        ['T,T', [T, T]],
        ['T,F', [T, F]],
        ['F,T', [F, T]],
        ['F,F', [F, F]],
      ] as const
    ).map(([label, kids]) => many(`${op}: ${label}`, [g(op, ...kids)])),
  ),
  // shapes
  many('and: empty list', [g('and')]),
  many('or: empty list', [g('or')]),
  many('not: empty list', [g('not')]),
  many('and: no list', [{ condition: 'and' }]),
  many('or: no list', [{ condition: 'or' }]),
  many('not: no list', [{ condition: 'not' }]),
  many('or: one condition, not a list', [{ condition: 'or', conditions: T }], false),
  many('not: one condition, not a list', [{ condition: 'not', conditions: F }], false),
  // nesting
  many('nested: or(F, and(T, not(F)))', [g('or', F, g('and', T, g('not', F)))]),
  many('nested: not(or(F, F))', [g('not', g('or', F, F))]),
  many('nested: not(or(F, T))', [g('not', g('or', F, T))]),
  many('nested: and(or(T, F), or(F, F))', [g('and', g('or', T, F), g('or', F, F))]),
  many('nested: three deep', [g('and', g('or', g('not', F), F), g('not', g('and', T, F)))]),
  many('top level list is and', [T, g('or', F, T), g('not', F)]),
  // switches inside groups
  many('and: only child turned off', [g('and', OFF(F))]),
  many('or: only child turned off', [g('or', OFF(T))]),
  many('not: only child turned off', [g('not', OFF(T))]),
  many('or: turned-off true and a false', [g('or', OFF(T), F)]),
  many('top: turned-off false', [T, OFF(F)]),
  many('templated enabled inside or with true', [g('or', { ...F, enabled: '{{ x }}' }, T)]),
  many('templated enabled inside and', [g('and', { ...T, enabled: '{{ x }}' }, T)]),
  // with server conditions (unknown until Home Assistant answers)
  many('server alone', [S]),
  many('server siblings at top', [S, S2]),
  many('server siblings under or', [g('or', S, S2)]),
  many('server and a true', [S, T]),
  many('server and a false', [S, F]),
  many('or: true with server', [g('or', T, S)]),
  many('or: false with server', [g('or', F, S)]),
  many('and: false with server', [g('and', F, S)]),
  many('not: around server', [g('not', S)]),
  many('not: around server and false', [g('not', S, F)]),
  many('all-server group sent whole', [g('or', S, g('not', S2))]),
  many('mixed group nested', [g('or', g('and', S, T), g('not', S2, F))]),
  many('server turned off', [T, OFF(S)]),
  many('state goes to the server', [
    { condition: 'state', entity: 'light.kitchen', state: 'on' },
    S,
  ]),
  many('state_not goes to the server', [
    g('or', { condition: 'state', entity: 'light.hall', state_not: 'on' }, S2),
  ]),
  many('numeric without bounds goes as a template', [
    { condition: 'numeric_state', entity: 'sensor.temp' },
  ]),
  many('numeric with an infinite bound', [
    { condition: 'numeric_state', entity: 'sensor.temp', below: -Infinity },
  ]),
  many('alias and note kept for the server', [
    { condition: 'state', entity: 'light.kitchen', state: 'on', alias: 'Lamp', note: 'n' },
  ]),
];

/** Every case. */
export const ALL_CASES: VisibilityCase[] = [...SINGLE_CASES, ...COMBINATOR_CASES];

/** A media query stand-in for node, agreeing with the browser tests' viewport. */
export const fakeMatchMedia = (query: string): { matches: boolean } => ({
  matches: query === '(min-width: 1px)',
});
