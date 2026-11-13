/**
 * Visibility conditions for the whole sidebar (and its mobile bar), with the
 * same conditions, shapes and results as Home Assistant's own card
 * visibility. A port of the Home Assistant frontend's condition code
 * (Apache-2.0, release 20261028.5): panels/lovelace/common/validate-condition.ts,
 * common/condition/translate.ts, split.ts and evaluate-locally.ts,
 * common/datetime/check_time.ts, the target resolution in data/selector.ts,
 * and the combining rules of common/controllers/condition-evaluator-controller.ts.
 * src/lib/visibility.parity.test.ts runs these against Home Assistant's own
 * files, kept in test/ha-frontend.
 *
 * As in Home Assistant: user, screen, time, location and view_columns are
 * checked in the browser. Everything else goes to Home Assistant through
 * `subscribe_condition`, which pushes the result as it changes, including
 * Lovelace state / numeric_state (translated to core's form) unless they use
 * something only the browser understands (an attribute, or values naming
 * entities). Sibling server conditions share one subscription. Until the
 * server answers, a local first guess stands in where the browser can tell.
 */

/** One visibility condition, in Lovelace or core shape. Loosely typed on purpose. */
export interface VisibilityCondition {
  /** The condition type. Absent on legacy `{ entity, state }` conditions. */
  condition?: string;
  /** `false` turns a condition off (skipped, as in core). */
  enabled?: boolean | string;
  [key: string]: unknown;
}

/** The types the visual editor can create, in menu order. */
export const CONDITION_TYPES = [
  'user',
  'screen',
  'time',
  'location',
  'state',
  'numeric_state',
  'template',
  'sun',
  'zone',
  'device',
  'and',
  'or',
  'not',
] as const;

/** A condition type the visual editor knows. */
export type ConditionType = (typeof CONDITION_TYPES)[number];

/** Client-only types. Never sent to `subscribe_condition`. */
const CLIENT_TYPES = new Set(['screen', 'user', 'view_columns', 'location', 'time']);

const LOGICAL_TYPES = new Set(['and', 'or', 'not']);

/** A state object, as far as the checks read it. */
interface StateObj {
  /** The state. */
  state: string;
  /** The attributes. */
  attributes?: Record<string, unknown>;
}

/** The parts of hass the checks read. */
export interface VisibilityHass {
  /** The current user. */
  user?: { id?: string };
  /** Entity states by id. */
  states?: Record<string, StateObj | undefined>;
  /** The user's profile locale; `time_zone: 'server'` uses the server's zone. */
  locale?: { time_zone?: string };
  /** The server config, for its time zone. */
  config?: { time_zone?: string };
  /** The entity registry. */
  entities?: Record<
    string,
    { device_id?: string | null; area_id?: string | null; labels?: string[] } | undefined
  >;
  /** The device registry. */
  devices?: Record<
    string,
    { area_id?: string | null; labels?: string[]; parent_device_id?: string | null } | undefined
  >;
  /** The area registry. */
  areas?: Record<string, { floor_id?: string | null; labels?: string[] } | undefined>;
  /** The websocket connection, for server conditions. */
  connection?: {
    subscribeMessage: (
      callback: (message: ServerMessage) => void,
      message: Record<string, unknown>,
    ) => Promise<() => unknown>;
  };
}

/** What `subscribe_condition` pushes. */
export interface ServerMessage {
  /** Whether the condition holds. */
  result?: boolean;
  /** Set when the condition could not be evaluated. */
  error?: unknown;
}

const ensureArray = <T>(v: T | T[] | undefined | null): T[] | undefined =>
  v === undefined || v === null ? undefined : Array.isArray(v) ? v : [v];

const isValidEntityId = (v: unknown): boolean => /^(\w+)\.(\w+)$/.test(String(v));

const computeDomain = (entityId: string): string => entityId.substring(0, entityId.indexOf('.'));

/** True if `value` looks like an entity id, not a numeric literal. */
export const isEntityReference = (value: unknown): value is string =>
  typeof value === 'string' && Number.isNaN(Number(value)) && isValidEntityId(value);

/** `and` / `or` / `not`. */
export const isLogical = (c: VisibilityCondition): boolean =>
  typeof c.condition === 'string' && LOGICAL_TYPES.has(c.condition);

/** Children of a logical condition: a single item or a list. */
export const childrenOf = (c: VisibilityCondition): VisibilityCondition[] =>
  ensureArray(c.conditions as VisibilityCondition | VisibilityCondition[] | undefined) ?? [];

/** `enabled: false`. Skipped inside `and` / `or` / `not`, as core does. */
export const isDisabled = (c: VisibilityCondition): boolean =>
  'enabled' in c && c.enabled === false;

// ------------------------------------------------------- browser checks
// Home Assistant's checkConditionsMet, condition by condition.

/** The state of the entity a value names, if it names one that exists. */
const valueFromEntityId = (hass: VisibilityHass, value: unknown): string | undefined =>
  isValidEntityId(value) && hass.states?.[value as string]
    ? hass.states[value as string]?.state
    : undefined;

/** The entity a state check reads: core `entity_id` first, then `entity`. */
const entityOf = (c: VisibilityCondition): unknown =>
  ('entity_id' in c ? c.entity_id : undefined) || c.entity;

const checkState = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const entityId = entityOf(c);
  const stateObj = entityId ? hass.states?.[entityId as string] : undefined;
  const attribute = c.attribute as string | undefined;
  let state: string;
  if (!stateObj) {
    state = 'unknown';
  } else if (attribute) {
    const attr = stateObj.attributes?.[attribute];
    state = attr == null ? 'unknown' : String(attr);
  } else {
    state = stateObj.state;
  }
  let value = (c.state ?? c.state_not) as unknown;
  if (value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    const fromEntities = value
      .map((v) => valueFromEntityId(hass, v))
      .filter((v): v is string => v !== undefined);
    value = [...value, ...fromEntities];
  } else if (typeof value === 'string') {
    const fromEntity = valueFromEntityId(hass, value);
    value = fromEntity ? [value, fromEntity] : [value];
  }
  const list = ensureArray(value as unknown) ?? [];
  return c.state != null ? list.includes(state) : !list.includes(state);
};

const checkNumericState = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const entityId = entityOf(c);
  const stateObj = entityId ? hass.states?.[entityId as string] : undefined;
  const attribute = c.attribute as string | undefined;
  const state = attribute ? stateObj?.attributes?.[attribute] : stateObj?.state;
  let above = c.above as unknown;
  let below = c.below as unknown;
  if (typeof above === 'string') {
    above = valueFromEntityId(hass, above) ?? above;
  }
  if (typeof below === 'string') {
    below = valueFromEntityId(hass, below) ?? below;
  }
  const value = Number(state);
  const lo = Number(above);
  const hi = Number(below);
  if (Number.isNaN(value)) {
    return false;
  }
  return (
    (c.above == null || Number.isNaN(lo) || lo < value) &&
    (c.below == null || Number.isNaN(hi) || hi > value)
  );
};

/** HH:MM or HH:MM:SS in range, as Home Assistant validates time strings. */
export const isValidTimeString = (time: unknown): boolean => {
  if (typeof time !== 'string' || time.trim() === '') {
    return false;
  }
  const parts = time.split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return false;
  }
  const [h, m, s = 0] = parts.map((p) => parseInt(p, 10));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59;
};

/** The current time; replaceable in tests. */
export const clock = { now: (): Date => new Date() };

/** The zone time conditions use: the server's if the profile says so, else the browser's. */
const timeZoneOf = (hass: VisibilityHass): string | undefined =>
  hass.locale?.time_zone === 'server' ? hass.config?.time_zone : undefined;

/** The wall-clock fields of an instant in a time zone. */
const wallClock = (
  instant: number,
  timeZone: string | undefined,
): { y: number; mo: number; d: number; h: number; mi: number; s: number; weekday: string } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    y: Number(get('year')),
    mo: Number(get('month')),
    d: Number(get('day')),
    h: Number(get('hour')),
    mi: Number(get('minute')),
    s: Number(get('second')),
    weekday: get('weekday').slice(0, 3).toLowerCase(),
  };
};

/** The instant of a wall-clock time today in a time zone (as TZDate builds it). */
const instantOf = (
  today: { y: number; mo: number; d: number },
  time: string,
  timeZone: string | undefined,
): number => {
  const [h, m, s = 0] = time.split(':').map((p) => parseInt(p, 10));
  const wanted = Date.UTC(today.y, today.mo - 1, today.d, h, m, s);
  // Find the offset at that moment; twice, so a time near a DST change settles.
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const w = wallClock(guess, timeZone);
    const shown = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);
    guess += wanted - shown;
  }
  return guess;
};

/** Home Assistant's checkTimeInRange: Before is inclusive, a window can cross midnight. */
const checkTime = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const timeZone = timeZoneOf(hass);
  const now = clock.now().getTime();
  const today = wallClock(now, timeZone);
  const weekdays = c.weekdays as string[] | undefined;
  if (weekdays && weekdays.length > 0 && !weekdays.includes(today.weekday)) {
    return false;
  }
  const after = c.after as string | undefined;
  const before = c.before as string | undefined;
  if (!after && !before) {
    return true;
  }
  const a = after ? instantOf(today, after, timeZone) : undefined;
  const b = before ? instantOf(today, before, timeZone) : undefined;
  if (a !== undefined && b !== undefined) {
    if (b < a) {
      return now >= a || now <= b; // crosses midnight, e.g. 22:00 to 06:00
    }
    return now >= a && now <= b;
  }
  if (a !== undefined) {
    return now >= a;
  }
  if (b !== undefined) {
    return now <= b;
  }
  return true;
};

/** The current user's person entity. */
const userPerson = (hass: VisibilityHass): StateObj | undefined => {
  const id = hass.user?.id;
  if (!id) {
    return undefined;
  }
  return Object.entries(hass.states ?? {}).find(
    ([entityId, s]) => computeDomain(entityId) === 'person' && s?.attributes?.user_id === id,
  )?.[1];
};

/** A target, as in a service call or a location condition. */
export interface Target {
  /** Entities. */
  entity_id?: string | string[];
  /** Devices, and through them their entities. */
  device_id?: string | string[];
  /** Areas, and through them their devices and entities. */
  area_id?: string | string[];
  /** Floors, and through them their areas. */
  floor_id?: string | string[];
  /** Labels, on entities, devices or areas. */
  label_id?: string | string[];
  /** Taken out of what the rest reaches. */
  exclude?: Target;
}

const TARGET_KEYS = ['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id'];

const isIdList = (value: unknown): boolean =>
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((id) => typeof id === 'string'));

const isTargetMapping = (target: unknown, allowExclude: boolean): boolean =>
  typeof target === 'object' &&
  target !== null &&
  !Array.isArray(target) &&
  Object.entries(target).every(([key, value]) =>
    key === 'exclude'
      ? allowExclude && isTargetMapping(value, false)
      : TARGET_KEYS.includes(key) && isIdList(value),
  );

/** A usable target: a mapping of target keys to ids, with an optional `exclude`. */
export const isValidTarget = (target: unknown): target is Target => isTargetMapping(target, true);

/** Devices whose area (or, without one, their parent's) is this area. */
const devicesInEffectiveArea = (hass: VisibilityHass, areaId: string): string[] => {
  const devices = hass.devices ?? {};
  return Object.entries(devices)
    .filter(([, d]) =>
      d?.area_id
        ? d.area_id === areaId
        : d?.parent_device_id
          ? devices[d.parent_device_id]?.area_id === areaId
          : false,
    )
    .map(([id]) => id);
};

/**
 * The entities with a state that a target reaches, as Home Assistant
 * resolves it: labels reach entities, devices and areas; floors reach areas;
 * areas reach their devices (by effective area) and entities; a device named
 * directly reaches its child devices; a device reached only through an area
 * leaves out entities assigned to another area.
 */
const resolveIncluded = (
  hass: VisibilityHass,
  target: Target,
  hasState: (id: string) => boolean,
): string[] => {
  const entities = hass.entities ?? {};
  const devices = hass.devices ?? {};
  const areas = hass.areas ?? {};
  const tEntities = new Set(ensureArray(target.entity_id));
  const tDevices = new Set(ensureArray(target.device_id));
  const tAreas = new Set(ensureArray(target.area_id));
  const directDevices = new Set(tDevices);
  for (const label of ensureArray(target.label_id) ?? []) {
    for (const [id, a] of Object.entries(areas)) {
      if (a?.labels?.includes(label)) tAreas.add(id);
    }
    for (const [id, d] of Object.entries(devices)) {
      if (d?.labels?.includes(label)) tDevices.add(id);
    }
    for (const [id, e] of Object.entries(entities)) {
      if (e?.labels?.includes(label) && hasState(id)) tEntities.add(id);
    }
  }
  for (const floor of ensureArray(target.floor_id) ?? []) {
    for (const [id, a] of Object.entries(areas)) {
      if (a?.floor_id === floor) tAreas.add(id);
    }
  }
  const notViaArea = new Set(tDevices);
  for (const area of tAreas) {
    for (const id of devicesInEffectiveArea(hass, area)) tDevices.add(id);
    for (const [id, e] of Object.entries(entities)) {
      if (e?.area_id === area && hasState(id)) tEntities.add(id);
    }
  }
  for (const [id, d] of Object.entries(devices)) {
    if (d?.parent_device_id && directDevices.has(d.parent_device_id)) {
      tDevices.add(id);
      notViaArea.add(id);
    }
  }
  for (const device of tDevices) {
    for (const [id, e] of Object.entries(entities)) {
      if (e?.device_id === device && hasState(id) && (notViaArea.has(device) || !e.area_id)) {
        tEntities.add(id);
      }
    }
  }
  return [...tEntities];
};

/** The entities a target reaches, less its `exclude`. */
export const resolveTarget = (
  hass: VisibilityHass,
  target: Target,
  hasState: (id: string) => boolean = (id) => !!hass.states?.[id],
): string[] => {
  const included = resolveIncluded(hass, target, hasState);
  if (!target.exclude) {
    return included;
  }
  const excluded = new Set(resolveIncluded(hass, target.exclude, hasState));
  return included.filter((id) => !excluded.has(id));
};

/** Zones a location target reaches that currently have a state. */
const locationZones = (hass: VisibilityHass, target: Target): string[] => {
  // Registered zones count as reachable even while reloading; only those
  // with a state are kept at the end, as Home Assistant does.
  const registered = (id: string): boolean => !!hass.states?.[id] || id in (hass.entities ?? {});
  return resolveTarget(hass, target, (id) => computeDomain(id) === 'zone' && registered(id))
    .filter((id) => computeDomain(id) === 'zone')
    .filter((id) => id in (hass.states ?? {}));
};

/** The state a person shows while a zone is their active zone; passive zones never are. */
const activeZoneState = (hass: VisibilityHass, zoneId: string): string | undefined => {
  const s = hass.states?.[zoneId];
  if (!s || s.attributes?.passive) {
    return undefined;
  }
  return zoneId === 'zone.home' ? 'home' : (s.attributes?.friendly_name as string | undefined);
};

const checkLocation = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const person = userPerson(hass);
  if (!person) {
    return false;
  }
  if (
    (c.locations as { includes?: (v: string) => boolean } | undefined)?.includes?.(person.state)
  ) {
    return true;
  }
  if (c.away === true && person.state === 'not_home') {
    return true;
  }
  if (!isValidTarget(c.target)) {
    return false;
  }
  const zones = locationZones(hass, c.target);
  const inZones = person.attributes?.in_zones;
  if (!Array.isArray(inZones) || inZones.length === 0) {
    return (
      person.state !== 'not_home' && zones.some((z) => activeZoneState(hass, z) === person.state)
    );
  }
  if (c.match_mode === 'active_zone') {
    const active = (inZones as string[]).find((z) => activeZoneState(hass, z) === person.state);
    return active !== undefined && zones.includes(active);
  }
  return (inZones as string[]).some((z) => zones.includes(z));
};

/**
 * Whether one condition holds, checked in the browser the way Home
 * Assistant's checkConditionsMet does (any type it doesn't know reads as a
 * state check). Throws on shapes it can't read, as Home Assistant's does.
 */
export const checkClientCondition = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  if (!('condition' in c) || c.condition === undefined) {
    return checkState(c, hass);
  }
  switch (c.condition) {
    case 'view_columns':
      return true; // the sidebar is not in a sections view column
    case 'time':
      return checkTime(c, hass);
    case 'screen':
      return c.media_query
        ? typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia(c.media_query as string).matches
        : false;
    case 'user': {
      const users = c.users as { includes: (v: string) => boolean } | undefined;
      return users && hass.user?.id ? users.includes(hass.user.id) : false;
    }
    case 'location':
      return checkLocation(c, hass);
    case 'numeric_state':
      return checkNumericState(c, hass);
    case 'and':
      return c.conditions ? checkList(c.conditions as VisibilityCondition[], hass) : true;
    case 'not':
      return c.conditions ? !checkList(c.conditions as VisibilityCondition[], hass) : true;
    case 'or':
      return c.conditions
        ? (c.conditions as VisibilityCondition[]).some((k) => checkList([k], hass))
        : true;
    default:
      return checkState(c, hass);
  }
};

const checkList = (list: VisibilityCondition[], hass: VisibilityHass): boolean =>
  list.every((c) => checkClientCondition(c, hass));

/** A browser check that reads anything it can't make sense of as not holding. */
const safeCheck = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  try {
    return checkClientCondition(c, hass);
  } catch {
    return false;
  }
};

// ------------------------------------------------------- server translation

/**
 * Lovelace state / numeric_state that core would evaluate differently, so
 * they stay in the browser: an attribute, values naming entities, or bounds
 * naming entities.
 */
const legacyOnly = (c: VisibilityCondition): boolean => {
  if (c.condition === 'numeric_state') {
    return [c.above, c.below].some(isEntityReference);
  }
  if ('attribute' in c && c.attribute !== undefined) {
    return true;
  }
  return [
    ...(ensureArray(c.state as unknown) ?? []),
    ...(ensureArray(c.state_not as unknown) ?? []),
  ].some(isEntityReference);
};

/** Whether Home Assistant evaluates this condition (a group only when all of it goes). */
export const isServerCondition = (c: VisibilityCondition): boolean => {
  if (isLogical(c)) {
    return childrenOf(c).every(isServerCondition);
  }
  if (!('condition' in c) || c.condition === undefined) {
    return !legacyOnly(c);
  }
  if (CLIENT_TYPES.has(c.condition)) {
    return false;
  }
  if ((c.condition === 'state' || c.condition === 'numeric_state') && !('entity_id' in c)) {
    return !legacyOnly(c);
  }
  return true;
};

/** The keys core keeps on any condition row. */
const rowConfig = (c: VisibilityCondition): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of ['alias', 'note', 'enabled']) {
    if (key in c) out[key] = c[key];
  }
  return out;
};

/** Always false: not(and of nothing). Stands in for an incomplete condition. */
const alwaysFalse = (): Record<string, unknown> => ({
  condition: 'not',
  conditions: [{ condition: 'and', conditions: [] }],
});

const translateState = (c: VisibilityCondition): Record<string, unknown> => {
  if ('entity_id' in c) {
    return { ...c };
  }
  const row = rowConfig(c);
  if (!c.entity || (c.state === undefined && c.state_not === undefined)) {
    return { ...row, ...alwaysFalse() };
  }
  const base: Record<string, unknown> = {
    condition: 'state',
    entity_id: c.entity,
    ...(c.attribute !== undefined ? { attribute: c.attribute } : {}),
  };
  if (c.state !== undefined) {
    return { ...row, ...base, state: c.state };
  }
  // core has no state_not: wrap a positive state in not
  return { ...row, condition: 'not', conditions: [{ ...base, state: c.state_not }] };
};

const NEVER = Symbol('never-satisfied');

/** A Lovelace numeric bound as core takes it: numbers, entity ids, or nothing. */
const numericBound = (bound: unknown, side: 'above' | 'below'): unknown => {
  if (bound == null) {
    return undefined;
  }
  const numeric = typeof bound === 'number' ? bound : Number(bound);
  if (Number.isNaN(numeric)) {
    return typeof bound === 'string' && isValidEntityId(bound) ? bound : undefined;
  }
  if (!Number.isFinite(numeric)) {
    return (side === 'above') === numeric > 0 ? NEVER : undefined;
  }
  return numeric;
};

const translateNumeric = (c: VisibilityCondition): Record<string, unknown> => {
  if ('entity_id' in c) {
    return { ...c };
  }
  const row = rowConfig(c);
  if (!c.entity) {
    return { ...row, ...alwaysFalse() };
  }
  const above = numericBound(c.above, 'above');
  const below = numericBound(c.below, 'below');
  if (above === NEVER || below === NEVER) {
    return { ...row, ...alwaysFalse() };
  }
  if (above === undefined && below === undefined) {
    // no usable bound: only "is it a number", which core says with a template
    const entity = JSON.stringify(c.entity);
    return {
      ...row,
      condition: 'template',
      value_template:
        c.attribute === undefined
          ? `{{ is_number(states(${entity})) }}`
          : `{{ is_number(state_attr(${entity}, ${JSON.stringify(c.attribute)})) }}`,
    };
  }
  const core: Record<string, unknown> = { ...row, condition: 'numeric_state', entity_id: c.entity };
  if (c.attribute !== undefined) core.attribute = c.attribute;
  if (above !== undefined) core.above = above;
  if (below !== undefined) core.below = below;
  return core;
};

/** A Lovelace condition in core's shape, for `subscribe_condition`. */
export const toCore = (c: VisibilityCondition): Record<string, unknown> => {
  if (!('condition' in c) || c.condition === undefined) {
    return translateState({ condition: 'state', ...c });
  }
  if (isLogical(c)) {
    const row = rowConfig(c);
    if (c.conditions === undefined) {
      return { ...row, condition: 'and', conditions: [] };
    }
    const conditions = childrenOf(c).map(toCore);
    if (c.condition === 'not') {
      // Lovelace not is NOT(AND); core not is NOT(OR)
      return { ...row, condition: 'not', conditions: [{ condition: 'and', conditions }] };
    }
    return { ...row, condition: c.condition, conditions };
  }
  if (c.condition === 'state') return translateState(c);
  if (c.condition === 'numeric_state') return translateNumeric(c);
  return { ...c };
};

// ------------------------------------------------------- split and combine

/** Server results by subscription id. */
type Results = Record<string, boolean | undefined>;
/** One node of a split tree: true, false, or unknown. */
type Node = (hass: VisibilityHass, results: Results) => boolean | undefined;

const andOf = (values: Array<boolean | undefined>): boolean | undefined => {
  let unknown = false;
  for (const v of values) {
    if (v === false) return false;
    if (v === undefined) unknown = true;
  }
  return unknown ? undefined : true;
};

const orOf = (values: Array<boolean | undefined>): boolean | undefined => {
  let unknown = false;
  for (const v of values) {
    if (v === true) return true;
    if (v === undefined) unknown = true;
  }
  return unknown ? undefined : false;
};

/** The tree split into server subscriptions and a browser-side combiner. */
export interface SplitTree {
  /** One `subscribe_condition` each, by id. */
  server: Array<{ id: string; condition: Record<string, unknown> }>;
  /** Every browser-checked leaf, for working out what to watch. */
  client: VisibilityCondition[];
  /** True / false, or undefined while a needed server result is missing. */
  evaluate: (hass: VisibilityHass, results: Results) => boolean | undefined;
}

/**
 * Splits a tree the way Home Assistant does: sibling server conditions under
 * one parent share a subscription, browser conditions are checked here,
 * `enabled: false` is skipped, a template `enabled` on a browser condition
 * stays unknown, and `not` is NOT(AND of its children).
 */
export const splitTree = (conditions: VisibilityCondition[]): SplitTree => {
  const server: SplitTree['server'] = [];
  const client: VisibilityCondition[] = [];
  const subscribe = (condition: Record<string, unknown>): Node => {
    const id = String(server.length);
    server.push({ id, condition });
    return (_hass, results) => results[id];
  };
  const siblings = (kids: VisibilityCondition[], op: 'and' | 'or'): Node[] => {
    const serverKids: VisibilityCondition[] = [];
    const clientKids: VisibilityCondition[] = [];
    for (const k of kids) {
      if (isDisabled(k)) continue;
      (isServerCondition(k) ? serverKids : clientKids).push(k);
    }
    const nodes: Node[] = [];
    if (serverKids.length === 1) {
      nodes.push(subscribe(toCore(serverKids[0])));
    } else if (serverKids.length > 1) {
      nodes.push(subscribe({ condition: op, conditions: serverKids.map(toCore) }));
    }
    for (const k of clientKids) {
      nodes.push(build(k));
    }
    return nodes;
  };
  const build = (c: VisibilityCondition): Node => {
    if ('enabled' in c && typeof c.enabled !== 'boolean') {
      return () => undefined;
    }
    if (isLogical(c)) {
      const kids = childrenOf(c);
      if (c.condition === 'or') {
        const nodes = siblings(kids, 'or');
        return (hass, results) => orOf(nodes.map((n) => n(hass, results)));
      }
      const nodes = siblings(kids, 'and');
      const all: Node = (hass, results) => andOf(nodes.map((n) => n(hass, results)));
      if (c.condition === 'not') {
        return (hass, results) => {
          const v = all(hass, results);
          return v === undefined ? undefined : !v;
        };
      }
      return all;
    }
    if (isServerCondition(c)) {
      return subscribe(toCore(c));
    }
    client.push(c);
    return (hass) => safeCheck(c, hass);
  };
  const root = siblings(conditions, 'and');
  return {
    server,
    client,
    evaluate: (hass, results) => andOf(root.map((n) => n(hass, results))),
  };
};

/**
 * A server state / numeric_state the browser can already answer exactly,
 * so a first guess can show before Home Assistant replies.
 */
const locallyAnswerable = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const type = c.condition ?? 'state';
  if (type !== 'state' && type !== 'numeric_state') {
    return false;
  }
  const states = hass.states ?? {};
  if (!('entity_id' in c)) {
    return !!c.entity && (c.entity as string) in states;
  }
  if (
    typeof c.entity_id !== 'string' ||
    !(c.entity_id in states) ||
    c.attribute !== undefined ||
    c.for !== undefined ||
    c.match !== undefined ||
    c.value_template !== undefined
  ) {
    return false;
  }
  if (type === 'numeric_state') {
    const bounds = [c.above, c.below].filter((b) => b !== undefined);
    return bounds.length > 0 && bounds.every((b) => typeof b === 'number');
  }
  return !(ensureArray(c.state as unknown) ?? []).some(isEntityReference);
};

/**
 * Home Assistant's first guess before the server replies: what the browser
 * can know exactly, with anything only the server can answer left unknown.
 */
export const evaluateLocally = (
  conditions: VisibilityCondition[],
  hass: VisibilityHass,
): boolean | undefined => {
  const node = (c: VisibilityCondition): boolean | undefined => {
    if ('enabled' in c && typeof c.enabled !== 'boolean') {
      return undefined;
    }
    if (isLogical(c)) {
      if (c.conditions === undefined) {
        return true;
      }
      const values = childrenOf(c)
        .filter((k) => !isDisabled(k))
        .map(node);
      if (c.condition === 'or') {
        return orOf(values);
      }
      const all = andOf(values);
      return c.condition === 'not' ? (all === undefined ? undefined : !all) : all;
    }
    if (!isServerCondition(c) || locallyAnswerable(c, hass)) {
      return safeCheck(c, hass);
    }
    return undefined;
  };
  return andOf(conditions.filter((c) => !isDisabled(c)).map(node));
};

/**
 * Whether the conditions hold, as far as the browser can tell. A condition
 * only the server can answer counts as not holding; {@link VisibilityEvaluator}
 * gives the full, live result.
 */
export const conditionsMet = (
  conditions: VisibilityCondition[] | undefined,
  hass: VisibilityHass,
): boolean => evaluateLocally(conditions ?? [], hass) === true;

// ------------------------------------------------------- watching

/** Every leaf of a tree, including disabled ones (cheap, and they may come back on). */
const leaves = (list: VisibilityCondition[]): VisibilityCondition[] =>
  list.flatMap((c) => (isLogical(c) ? leaves(childrenOf(c)) : [c]));

/**
 * The inputs the browser checks read, so a hass update that touches none of
 * them skips the re-check: the user, the time zone, each named entity's
 * state object (Home Assistant keeps the same object until it changes), and
 * for location the people, the zones and the registries.
 */
const inputsOf = (all: VisibilityCondition[], hass: VisibilityHass): unknown[] => {
  const inputs: unknown[] = [hass.user?.id];
  const add = (id: unknown): void => {
    if (typeof id === 'string' && isValidEntityId(id)) inputs.push(hass.states?.[id]);
  };
  for (const c of all) {
    switch (c.condition) {
      case 'time':
        inputs.push(hass.locale?.time_zone, hass.config?.time_zone);
        break;
      case 'location':
        for (const [id, s] of Object.entries(hass.states ?? {})) {
          if (id.startsWith('person.') || id.startsWith('zone.')) inputs.push(s);
        }
        inputs.push(hass.entities, hass.devices, hass.areas);
        break;
      default:
        add(entityOf(c));
        for (const v of [
          ...(ensureArray(c.state as unknown) ?? []),
          ...(ensureArray(c.state_not as unknown) ?? []),
          c.above,
          c.below,
        ]) {
          add(v);
        }
    }
  }
  return inputs;
};

const sameInputs = (a: unknown[] | undefined, b: unknown[]): boolean =>
  !!a && a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Milliseconds until the soonest moment a time condition can flip: an
 * `after`, just past a `before` (which is inclusive), or midnight (for
 * weekdays). Undefined with no time conditions.
 */
export const msToNextBoundary = (
  all: VisibilityCondition[],
  hass: VisibilityHass,
  now: Date = clock.now(),
): number | undefined => {
  const times = all.filter((c) => c.condition === 'time');
  if (times.length === 0) {
    return undefined;
  }
  const w = wallClock(now.getTime(), timeZoneOf(hass));
  const nowMs = (w.h * 3600 + w.mi * 60 + w.s) * 1000 + now.getMilliseconds();
  const toMs = (t: string): number => {
    const [h, m, s = 0] = t.split(':').map((p) => parseInt(p, 10));
    return (h * 3600 + m * 60 + s) * 1000;
  };
  const marks = new Set<number>([0]);
  for (const c of times) {
    if (isValidTimeString(c.after)) marks.add(toMs(c.after as string));
    if (isValidTimeString(c.before)) marks.add(toMs(c.before as string) + 1);
  }
  let soonest = Infinity;
  for (const m of marks) {
    soonest = Math.min(soonest, m > nowMs ? m - nowMs : m + 86400000 - nowMs);
  }
  return soonest + 20;
};

/**
 * Live evaluation of a condition list, combined the way Home Assistant's
 * condition evaluator does: browser checks plus one `subscribe_condition` per
 * server subtree; an error from the server hides the whole thing. Screen
 * conditions follow their media queries and time conditions wake at their
 * next boundary, so nothing is polled.
 */
export class VisibilityEvaluator {
  /** The decided result: true, false, or undefined while the server hasn't answered. */
  public definitive: boolean | undefined;
  /** The decided result, or the browser's first guess while waiting (may be undefined). */
  public result: boolean | undefined;

  private _signature?: string;
  private _connection?: VisibilityHass['connection'];
  private _split?: SplitTree;
  private _all: VisibilityCondition[] = [];
  private _conditions: VisibilityCondition[] = [];
  private _results: Results = {};
  private _errors: Record<string, boolean> = {};
  private _unsubs: Array<Promise<() => unknown>> = [];
  private _media: Array<{ mql: MediaQueryList; listener: () => void }> = [];
  private _timer?: ReturnType<typeof setTimeout>;
  private _generation = 0;
  private _hass?: VisibilityHass;
  private _inputs?: unknown[];

  /**
   * Creates an evaluator.
   * @param onChange Called when `result` changes on its own (a push, a media query, the clock).
   */
  public constructor(private readonly onChange: () => void) {}

  /** The number of open server subscriptions, for tests. */
  public get subscriptions(): number {
    return this._unsubs.length;
  }

  /**
   * Re-reads the conditions and hass and returns the result (the browser's
   * first guess while the server hasn't answered). Cheap when nothing the
   * conditions read has changed.
   */
  public observe(
    conditions: VisibilityCondition[] | undefined,
    hass: VisibilityHass,
  ): boolean | undefined {
    this._hass = hass;
    const signature = JSON.stringify(conditions ?? []);
    if (signature !== this._signature || hass.connection !== this._connection) {
      this._resubscribe(conditions ?? [], hass, signature);
    }
    // Screen matches count too, since a resize can land before the browser
    // fires their change events (and WebKit only refreshes a kept query list
    // on its next rendering update, so ask afresh).
    const inputs = [
      ...inputsOf(this._all, hass),
      ...this._media.map((m) => window.matchMedia(m.mql.media).matches),
    ];
    if (!sameInputs(this._inputs, inputs)) {
      this._inputs = inputs;
      this._recompute(false);
    }
    return this.result;
  }

  /** Drops every subscription, listener and timer. */
  public dispose(): void {
    this._generation += 1;
    for (const p of this._unsubs) {
      void p.then((unsub) => unsub()).catch(() => undefined);
    }
    this._unsubs = [];
    for (const { mql, listener } of this._media) {
      mql.removeEventListener('change', listener);
    }
    this._media = [];
    if (this._timer !== undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    this._signature = undefined;
    this._inputs = undefined;
    this.result = undefined;
    this.definitive = undefined;
  }

  /** Closes the old subscriptions and opens new ones for the conditions. */
  private _resubscribe(
    conditions: VisibilityCondition[],
    hass: VisibilityHass,
    signature: string,
  ): void {
    this.dispose();
    this._signature = signature;
    this._connection = hass.connection;
    this._conditions = conditions;
    this._split = splitTree(conditions);
    this._all = leaves(conditions);
    this._results = {};
    this._errors = {};
    const generation = this._generation;
    for (const sub of this._split.server) {
      if (!hass.connection) {
        continue; // no answer can come: stays unknown, and the first guess stands
      }
      const promise = hass.connection.subscribeMessage(
        (message) => {
          if (generation !== this._generation) return;
          if (message.error !== undefined) {
            this._results[sub.id] = false;
            this._errors[sub.id] = true;
          } else {
            this._results[sub.id] = message.result === true;
            this._errors[sub.id] = false;
          }
          this._recompute(true);
        },
        { type: 'subscribe_condition', condition: sub.condition },
      );
      promise.catch(() => {
        if (generation !== this._generation) return;
        this._results[sub.id] = false;
        this._errors[sub.id] = true;
        this._recompute(true);
      });
      this._unsubs.push(promise);
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      for (const c of this._all) {
        if (c.condition === 'screen' && typeof c.media_query === 'string' && c.media_query) {
          const mql = window.matchMedia(c.media_query);
          const listener = (): void => this._recompute(true);
          mql.addEventListener('change', listener);
          this._media.push({ mql, listener });
        }
      }
    }
    this._schedule();
  }

  /** Sets the timer for the next time boundary, if any. */
  private _schedule(): void {
    if (this._timer !== undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    const wait = this._hass ? msToNextBoundary(this._all, this._hass) : undefined;
    if (wait === undefined) {
      return;
    }
    const generation = this._generation;
    this._timer = setTimeout(() => {
      if (generation !== this._generation) return;
      this._recompute(true);
      this._schedule();
    }, wait);
  }

  /** Re-evaluates, notifying the owner if the result changed and asked to. */
  private _recompute(notify: boolean): void {
    let definitive: boolean | undefined;
    if (this._split && this._hass) {
      // An error from the server hides it all, rather than being a false a
      // `not` would turn into true.
      definitive = Object.values(this._errors).some(Boolean)
        ? false
        : this._split.evaluate(this._hass, this._results);
    }
    const next =
      definitive ?? (this._hass ? evaluateLocally(this._conditions, this._hass) : undefined);
    this.definitive = definitive;
    if (next !== this.result) {
      this.result = next;
      if (notify) {
        this.onChange();
      }
    }
  }
}
