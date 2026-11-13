/**
 * Visibility conditions for the whole sidebar (and its mobile bar), with the
 * same conditions, shapes and results as Home Assistant's own card
 * visibility. Ported from the Home Assistant frontend
 * (panels/lovelace/common/validate-condition.ts, common/condition/split.ts,
 * common/condition/translate.ts, common/datetime/check_time.ts), so a list
 * copied from a card's Visibility tab behaves the same here.
 *
 * Client conditions (user, screen, time, location, and Lovelace state /
 * numeric_state) are checked in the browser. Core conditions (template, sun,
 * zone, device, core-format state with `entity_id`, integration conditions)
 * are evaluated by Home Assistant through `subscribe_condition`, which pushes
 * the result whenever it changes. Until every needed result is in, the
 * outcome is unknown, so nothing flashes.
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

/** Types checked in the browser and never sent to Home Assistant. */
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
  /** Set when the condition could not be evaluated; reads as not holding. */
  error?: unknown;
}

const ensureArray = <T>(v: T | T[] | undefined | null): T[] | undefined =>
  v === undefined || v === null ? undefined : Array.isArray(v) ? v : [v];

const isValidEntityId = (v: string): boolean => /^\w+\.\w+$/.test(v);

/** `and` / `or` / `not`. */
export const isLogical = (c: VisibilityCondition): boolean =>
  typeof c.condition === 'string' && LOGICAL_TYPES.has(c.condition);

/** Children of a logical condition: a single item or a list. */
export const childrenOf = (c: VisibilityCondition): VisibilityCondition[] =>
  ensureArray(c.conditions as VisibilityCondition | VisibilityCondition[] | undefined) ?? [];

// ------------------------------------------------------------------ client

/** The entity a Lovelace or core state condition reads. */
const entityOf = (c: VisibilityCondition): string | undefined => {
  const id = (c.entity_id as string | string[] | undefined) ?? (c.entity as string | undefined);
  return Array.isArray(id) ? id[0] : id;
};

/** The state of the entity a value names, if it names one that exists. */
const referencedState = (hass: VisibilityHass, value: string): string | undefined =>
  isValidEntityId(value) ? hass.states?.[value]?.state : undefined;

const checkState = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const entityId = entityOf(c);
  const stateObj = entityId ? hass.states?.[entityId] : undefined;
  const attribute = c.attribute as string | undefined;
  let state: string;
  if (!stateObj) {
    state = 'unknown';
  } else if (attribute) {
    const attr = stateObj.attributes?.[attribute];
    state = attr === undefined || attr === null ? 'unknown' : String(attr);
  } else {
    state = stateObj.state;
  }
  const raw = (c.state ?? c.state_not) as string | string[] | undefined;
  if (raw === undefined) {
    return false;
  }
  const values = (ensureArray(raw) ?? []).map(String);
  for (const v of [...values]) {
    const s = referencedState(hass, v);
    if (s !== undefined) {
      values.push(s);
    }
  }
  return c.state !== undefined && c.state !== null
    ? values.includes(state)
    : !values.includes(state);
};

const checkNumericState = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const entityId = entityOf(c);
  const stateObj = entityId ? hass.states?.[entityId] : undefined;
  const attribute = c.attribute as string | undefined;
  const state = attribute ? stateObj?.attributes?.[attribute] : stateObj?.state;
  const bound = (v: unknown): number =>
    Number(typeof v === 'string' ? (referencedState(hass, v) ?? v) : v);
  const value = Number(state);
  if (state === undefined || state === null || state === '' || Number.isNaN(value)) {
    return false;
  }
  const lo = bound(c.above);
  const hi = bound(c.below);
  return (
    (c.above === undefined || c.above === null || Number.isNaN(lo) || lo < value) &&
    (c.below === undefined || c.below === null || Number.isNaN(hi) || hi > value)
  );
};

/** The weekday key (`mon`...) and seconds into the day, in a time zone. */
const nowIn = (now: Date, timeZone: string | undefined): { weekday: string; seconds: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    weekday: get('weekday').slice(0, 3).toLowerCase(),
    seconds: Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second')),
  };
};

/** Seconds into the day for HH:MM or HH:MM:SS. */
const toSeconds = (time: string): number => {
  const [h, m, s] = time.split(':').map((p) => parseInt(p, 10));
  return h * 3600 + m * 60 + (s || 0);
};

/** HH:MM or HH:MM:SS in range, as Home Assistant validates time strings. */
export const isValidTimeString = (time: unknown): boolean => {
  if (typeof time !== 'string') {
    return false;
  }
  const parts = time.split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d{1,2}$/.test(p))) {
    return false;
  }
  const [h, m, s = 0] = parts.map((p) => parseInt(p, 10));
  return h <= 23 && m <= 59 && s <= 59;
};

/** The zone time conditions use: the server's, if the profile says so. */
const timeZoneOf = (hass: VisibilityHass): string | undefined =>
  hass.locale?.time_zone === 'server' ? hass.config?.time_zone : undefined;

/** The current time; replaceable in tests. */
export const clock = { now: (): Date => new Date() };

const checkTime = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const now = nowIn(clock.now(), timeZoneOf(hass));
  const weekdays = ensureArray(c.weekdays as string | string[] | undefined);
  if (weekdays && weekdays.length > 0 && !weekdays.includes(now.weekday)) {
    return false;
  }
  const after = isValidTimeString(c.after) ? toSeconds(c.after as string) : undefined;
  const before = isValidTimeString(c.before) ? toSeconds(c.before as string) : undefined;
  if (after !== undefined && before !== undefined) {
    if (before < after) {
      // crosses midnight, e.g. 22:00 to 06:00
      return now.seconds >= after || now.seconds < before;
    }
    return now.seconds >= after && now.seconds < before;
  }
  if (after !== undefined) {
    return now.seconds >= after;
  }
  if (before !== undefined) {
    return now.seconds < before;
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
    ([entityId, s]) => entityId.startsWith('person.') && s?.attributes?.user_id === id,
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

/**
 * The entities a target reaches, the way Home Assistant resolves it: labels
 * reach entities, devices and areas; floors reach areas; areas reach their
 * devices and entities; a directly targeted device reaches its child
 * devices; and a device reached only through an area does not pull in an
 * entity assigned to another area.
 */
export const resolveTarget = (hass: VisibilityHass, target: Target): string[] => {
  const entities = hass.entities ?? {};
  const devices = hass.devices ?? {};
  const areas = hass.areas ?? {};
  const tEntities = new Set(ensureArray(target.entity_id));
  const tDevices = new Set(ensureArray(target.device_id));
  const tAreas = new Set(ensureArray(target.area_id));
  for (const label of ensureArray(target.label_id) ?? []) {
    for (const [id, a] of Object.entries(areas)) {
      if (a?.labels?.includes(label)) tAreas.add(id);
    }
    for (const [id, d] of Object.entries(devices)) {
      if (d?.labels?.includes(label)) tDevices.add(id);
    }
    for (const [id, e] of Object.entries(entities)) {
      if (e?.labels?.includes(label)) tEntities.add(id);
    }
  }
  for (const floor of ensureArray(target.floor_id) ?? []) {
    for (const [id, a] of Object.entries(areas)) {
      if (a?.floor_id === floor) tAreas.add(id);
    }
  }
  // Devices named directly (or by label) reach their children and all their
  // entities; devices reached through an area reach only unassigned ones.
  const direct = new Set(tDevices);
  for (const [id, d] of Object.entries(devices)) {
    if (d?.parent_device_id && direct.has(d.parent_device_id)) direct.add(id);
  }
  const viaArea = new Set<string>();
  for (const area of tAreas) {
    for (const [id, d] of Object.entries(devices)) {
      if (d?.area_id === area && !direct.has(id)) viaArea.add(id);
    }
    for (const [id, e] of Object.entries(entities)) {
      if (e?.area_id === area) tEntities.add(id);
    }
  }
  for (const [id, e] of Object.entries(entities)) {
    if (!e?.device_id) continue;
    if (direct.has(e.device_id) || (viaArea.has(e.device_id) && !e.area_id)) tEntities.add(id);
  }
  const included = [...tEntities];
  if (!target.exclude) {
    return included;
  }
  const excluded = new Set(resolveTarget(hass, target.exclude));
  return included.filter((id) => !excluded.has(id));
};

/** The state a person shows while a zone is their active zone; passive zones never are. */
const activeZoneState = (hass: VisibilityHass, zoneId: string): string | undefined => {
  const s = hass.states?.[zoneId];
  if (!s || s.attributes?.passive) {
    return undefined;
  }
  return zoneId === 'zone.home' ? 'home' : (s.attributes?.friendly_name as string | undefined);
};

/** Whether a target names anything. */
export const hasTarget = (t: unknown): t is Target =>
  !!t &&
  typeof t === 'object' &&
  ['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id'].some(
    (k) => (ensureArray((t as Record<string, string | string[]>)[k]) ?? []).length > 0,
  );

const checkLocation = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  const person = userPerson(hass);
  if (!person) {
    return false;
  }
  if ((ensureArray(c.locations as string | string[] | undefined) ?? []).includes(person.state)) {
    return true;
  }
  if (c.away === true && person.state === 'not_home') {
    return true;
  }
  if (!hasTarget(c.target)) {
    return false;
  }
  const zones = resolveTarget(hass, c.target).filter(
    (id) => id.startsWith('zone.') && hass.states?.[id],
  );
  const inZones = person.attributes?.in_zones;
  if (!Array.isArray(inZones) || inZones.length === 0) {
    // older person entities: only the active zone is known
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

/** Whether a client condition holds. Server conditions are not decided here. */
export const checkClientCondition = (c: VisibilityCondition, hass: VisibilityHass): boolean => {
  switch (c.condition) {
    case 'view_columns':
      return true; // the sidebar is not in a sections view column
    case 'time':
      return checkTime(c, hass);
    case 'screen':
      return typeof c.media_query === 'string' && c.media_query !== ''
        ? typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia(c.media_query).matches
        : false;
    case 'user':
      return Array.isArray(c.users) && hass.user?.id ? c.users.includes(hass.user.id) : false;
    case 'location':
      return checkLocation(c, hass);
    case 'numeric_state':
      return checkNumericState(c, hass);
    case 'state':
    case undefined:
      return checkState(c, hass);
    default:
      return false;
  }
};

// ------------------------------------------------------------------ server

/**
 * Whether Home Assistant evaluates this condition. Lovelace state and
 * numeric_state (`entity:`) are checked in the browser with Home Assistant's
 * rules (the same result, without a subscription); core-format ones
 * (`entity_id:`), template, sun, zone, device and integration conditions go
 * to the server. A group goes as a whole when all its children do.
 */
export const isServerCondition = (c: VisibilityCondition): boolean => {
  if (isLogical(c)) {
    const kids = childrenOf(c).filter((k) => k.enabled !== false);
    return kids.length > 0 && kids.every(isServerCondition);
  }
  if (c.condition === undefined || CLIENT_TYPES.has(c.condition)) {
    return false;
  }
  if ((c.condition === 'state' || c.condition === 'numeric_state') && !('entity_id' in c)) {
    return false;
  }
  return true;
};

/** Lovelace `entity:` state checks as core sees them, for a group sent whole. */
const toCore = (c: VisibilityCondition): Record<string, unknown> => {
  if (isLogical(c)) {
    return { ...c, conditions: childrenOf(c).map(toCore) };
  }
  return { ...c };
};

/** Server results by subscription id. */
type Results = Record<string, boolean | undefined>;
/** One node of a split tree: true, false, or unknown. */
type Node = (hass: VisibilityHass, results: Results) => boolean | undefined;

const andNode =
  (kids: Node[]): Node =>
  (hass, results) => {
    let unknown = false;
    for (const k of kids) {
      const v = k(hass, results);
      if (v === false) return false;
      if (v === undefined) unknown = true;
    }
    return unknown ? undefined : true;
  };

const orNode =
  (kids: Node[]): Node =>
  (hass, results) => {
    if (kids.length === 0) return true; // an empty group, like a missing list, holds
    let unknown = false;
    for (const k of kids) {
      const v = k(hass, results);
      if (v === true) return true;
      if (v === undefined) unknown = true;
    }
    return unknown ? undefined : false;
  };

/** The tree split into server subscriptions and a browser-side combiner. */
export interface SplitTree {
  /** One `subscribe_condition` each, by id. */
  server: Array<{ id: string; condition: Record<string, unknown> }>;
  /** Every client condition in the tree, for working out what to watch. */
  client: VisibilityCondition[];
  /** True / false, or undefined while a needed server result is missing. */
  evaluate: (hass: VisibilityHass, results: Results) => boolean | undefined;
}

/**
 * Splits a tree the way Home Assistant does: sibling server conditions under
 * one parent share a subscription, client conditions are checked here,
 * `enabled: false` is skipped, an `enabled` template is left to the server,
 * and `not` means none of its children hold.
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
    const nodes: Node[] = [];
    for (const k of kids) {
      if (k.enabled === false) continue;
      if (isServerCondition(k)) {
        serverKids.push(k);
      } else {
        nodes.push(build(k));
      }
    }
    if (serverKids.length === 1) {
      nodes.unshift(subscribe(toCore(serverKids[0])));
    } else if (serverKids.length > 1) {
      nodes.unshift(subscribe({ condition: op, conditions: serverKids.map(toCore) }));
    }
    return nodes;
  };
  const build = (c: VisibilityCondition): Node => {
    if (isLogical(c)) {
      const kids = childrenOf(c);
      if (c.condition === 'or') {
        return orNode(siblings(kids, 'or'));
      }
      const all = andNode(siblings(kids, 'and'));
      if (c.condition === 'not') {
        return (hass, results) => {
          const v = all(hass, results);
          return v === undefined ? undefined : !v;
        };
      }
      return all;
    }
    if (c.enabled !== undefined && c.enabled !== true) {
      // a templated `enabled` only the server can read
      return subscribe(toCore(c));
    }
    client.push(c);
    return (hass) => checkClientCondition(c, hass);
  };
  const root = andNode(siblings(conditions, 'and'));
  return { server, client, evaluate: (hass, results) => root(hass, results) };
};

/**
 * Whether the conditions hold, checking only in the browser. A server
 * condition counts as not holding here; {@link VisibilityEvaluator} gives the
 * full, live result.
 */
export const conditionsMet = (
  conditions: VisibilityCondition[] | undefined,
  hass: VisibilityHass,
): boolean => {
  const split = splitTree(conditions ?? []);
  const results = Object.fromEntries(split.server.map((s) => [s.id, false]));
  return split.evaluate(hass, results) ?? false;
};

// ------------------------------------------------------------------ watching

/**
 * The inputs the client conditions read, so a hass update that touches none
 * of them skips the re-check: the user, the time zone, each named entity's
 * state object (Home Assistant keeps the same object until it changes), and
 * for location the person, the zones and the registries.
 */
const inputsOf = (client: VisibilityCondition[], hass: VisibilityHass): unknown[] => {
  const inputs: unknown[] = [hass.user?.id];
  const add = (id: unknown): void => {
    if (typeof id === 'string' && isValidEntityId(id)) inputs.push(hass.states?.[id]);
  };
  for (const c of client) {
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
      case 'state':
      case 'numeric_state':
      case undefined:
        add(entityOf(c));
        for (const v of [
          ...(ensureArray(c.state as string | string[] | undefined) ?? []),
          ...(ensureArray(c.state_not as string | string[] | undefined) ?? []),
          c.above,
          c.below,
        ]) {
          add(v);
        }
        break;
      default:
        break;
    }
  }
  return inputs;
};

const sameInputs = (a: unknown[] | undefined, b: unknown[]): boolean =>
  !!a && a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Milliseconds until the soonest moment a time condition can flip: an
 * `after`, a `before`, or (with weekdays) midnight. Undefined with none.
 */
export const msToNextBoundary = (
  client: VisibilityCondition[],
  hass: VisibilityHass,
  now: Date = clock.now(),
): number | undefined => {
  const times = client.filter((c) => c.condition === 'time');
  if (times.length === 0) {
    return undefined;
  }
  const { seconds } = nowIn(now, timeZoneOf(hass));
  const marks = new Set<number>([0]);
  for (const c of times) {
    for (const t of [c.after, c.before]) {
      if (isValidTimeString(t)) marks.add(toSeconds(t as string));
    }
  }
  let soonest = Infinity;
  for (const m of marks) {
    const wait = m > seconds ? m - seconds : m + 86400 - seconds;
    soonest = Math.min(soonest, wait);
  }
  // land just past the boundary, whatever the milliseconds are now
  return soonest * 1000 - now.getMilliseconds() + 50;
};

/**
 * Live evaluation of a condition list: browser checks plus one
 * `subscribe_condition` per server subtree, resubscribing when the
 * conditions or the connection change. Screen conditions follow their media
 * queries and time conditions wake at their next boundary, so nothing is
 * polled. `result` is undefined until it can be decided.
 */
export class VisibilityEvaluator {
  /** True, false, or undefined while a server result is still missing. */
  public result: boolean | undefined;

  private _signature?: string;
  private _connection?: VisibilityHass['connection'];
  private _split?: SplitTree;
  private _results: Results = {};
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
   * Re-reads the conditions and hass and returns the result. Cheap when
   * nothing the conditions read has changed.
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
    // screen matches count too, since a resize can land before the browser
    // fires their change events (and WebKit only refreshes a kept query
    // list on its next rendering update, so ask afresh)
    const inputs = [
      ...inputsOf(this._split?.client ?? [], hass),
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
    this._split = splitTree(conditions);
    this._results = {};
    const generation = this._generation;
    for (const sub of this._split.server) {
      if (!hass.connection) {
        this._results[sub.id] = false;
        continue;
      }
      const promise = hass.connection.subscribeMessage(
        (message) => {
          if (generation !== this._generation) return;
          this._results[sub.id] = message.error === undefined && message.result === true;
          this._recompute(true);
        },
        { type: 'subscribe_condition', condition: sub.condition },
      );
      promise.catch(() => {
        if (generation !== this._generation) return;
        this._results[sub.id] = false;
        this._recompute(true);
      });
      this._unsubs.push(promise);
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      for (const c of this._split.client) {
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
    const wait = this._hass ? msToNextBoundary(this._split?.client ?? [], this._hass) : undefined;
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
    const next =
      this._split && this._hass ? this._split.evaluate(this._hass, this._results) : undefined;
    if (next !== this.result) {
      this.result = next;
      if (notify) {
        this.onChange();
      }
    }
  }
}
