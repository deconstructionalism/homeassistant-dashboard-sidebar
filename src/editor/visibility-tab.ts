import type { HomeAssistant } from 'custom-card-helpers';
import {
  html,
  nothing,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from 'lit';
import Sortable from 'sortablejs';

import { visibilityErrors } from '../lib/validate';
import {
  childrenOf,
  evaluateLocally,
  isLogical,
  MIN_SERVER_CONDITIONS,
  isValidTimeString,
  VisibilityEvaluator,
  type VisibilityCondition,
  type VisibilityHass,
} from '../lib/visibility';
import {
  checkboxField,
  codeField,
  entityField,
  selectField,
  textField,
  titleCase,
} from './block-form';
import { menuStyle, popupMenu, type MenuItem } from './editor-menus';

/** What the Visibility tab needs from the editor that hosts it. */
export interface VisibilityTabHost extends ReactiveControllerHost {
  /** The current Home Assistant object. */
  hass?: HomeAssistant;
  /** Where the tab renders, to wire drag and drop. */
  readonly renderRoot: HTMLElement | DocumentFragment;
  /** The working copy's conditions (empty when none). */
  readonly visibilityConditions: VisibilityCondition[];
  /** Replaces the working copy's conditions; an empty list removes the key. */
  setVisibilityConditions(list: VisibilityCondition[]): void;
  /** The editor's YAML editor, with its error line. */
  yamlEditor(
    value: unknown,
    onChange: (value: unknown) => void,
    validate: (parsed: unknown) => string[],
  ): TemplateResult;
}

/** A condition's place in the tree: indices from the top-level list down. */
type Path = number[];

/** Each type's label (the YAML word, title-cased), icon and add-menu group. */
const TYPE_META: Record<string, { label: string; icon: string }> = {
  user: { label: 'User', icon: 'mdi:account' },
  screen: { label: 'Screen', icon: 'mdi:monitor-cellphone' },
  time: { label: 'Time', icon: 'mdi:clock-outline' },
  location: { label: 'Location', icon: 'mdi:map-marker' },
  state: { label: 'State', icon: 'mdi:list-status' },
  numeric_state: { label: 'Numeric State', icon: 'mdi:numeric' },
  template: { label: 'Template', icon: 'mdi:code-braces' },
  sun: { label: 'Sun', icon: 'mdi:weather-sunset' },
  zone: { label: 'Zone', icon: 'mdi:map-marker-radius' },
  device: { label: 'Device', icon: 'mdi:devices' },
  and: { label: 'And', icon: 'mdi:ampersand' },
  or: { label: 'Or', icon: 'mdi:gate-or' },
  not: { label: 'Not', icon: 'mdi:gate-not' },
};

const ADD_GROUPS: Array<[string, string[]]> = [
  ['Who and where', ['user', 'location', 'zone']],
  ['Screen and time', ['screen', 'time', 'sun']],
  ['Entities and devices', ['state', 'numeric_state', 'device']],
  ['Advanced', ['template']],
  ['Groups', ['and', 'or', 'not']],
];

/** A new condition of a type, with the fields its form starts from. */
const blank = (type: string): VisibilityCondition => {
  switch (type) {
    case 'user':
      return { condition: 'user', users: [] };
    case 'screen':
      return { condition: 'screen', media_query: '' };
    case 'state':
      return { condition: 'state', entity: '', state: '' };
    case 'numeric_state':
      return { condition: 'numeric_state', entity: '' };
    case 'template':
      return { condition: 'template', value_template: '' };
    case 'sun':
      return { condition: 'sun', after: 'sunset' };
    case 'and':
    case 'or':
    case 'not':
      return { condition: type, conditions: [] };
    default:
      return { condition: type };
  }
};

/** The label for a condition's type, including legacy and integration ones. */
export const conditionLabel = (c: VisibilityCondition): string => {
  if (c.condition === undefined) {
    return 'State';
  }
  return TYPE_META[c.condition]?.label ?? titleCase(c.condition.replace(/[._]/g, ' '));
};

const iconFor = (c: VisibilityCondition): string =>
  TYPE_META[c.condition ?? 'state']?.icon ?? 'mdi:puzzle-outline';

const asList = (v: unknown): string[] =>
  v === undefined || v === null || v === '' ? [] : (Array.isArray(v) ? v : [v]).map(String);

const WEEKDAYS: Array<[string, string]> = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
];

/** Home Assistant's screen sizes, as its own Screen condition offers them. */
const SCREEN_SIZES: Array<{ id: string; label: string; min: number }> = [
  { id: 'mobile', label: 'Mobile', min: 0 },
  { id: 'tablet', label: 'Tablet', min: 768 },
  { id: 'desktop', label: 'Desktop', min: 1024 },
  { id: 'wide', label: 'Wide', min: 1280 },
];

/** The media query for a set of sizes, as Home Assistant builds it. */
export const screenQuery = (sizes: string[]): string => {
  const on = SCREEN_SIZES.map((s) => sizes.includes(s.id));
  const parts: string[] = [];
  for (let i = 0; i < on.length; i++) {
    if (!on[i] || (i > 0 && on[i - 1])) continue;
    let j = i;
    while (j + 1 < on.length && on[j + 1]) j++;
    const min = SCREEN_SIZES[i].min;
    const max = j + 1 < SCREEN_SIZES.length ? SCREEN_SIZES[j + 1].min - 1 : undefined;
    const q = [min > 0 ? `(min-width: ${min}px)` : '', max ? `(max-width: ${max}px)` : '']
      .filter(Boolean)
      .join(' and ');
    parts.push(q);
  }
  return parts.join(', ');
};

/** The sizes a media query was built from, or undefined if it is custom. */
export const screenSizes = (query: string): string[] | undefined => {
  if (!query) return [];
  for (let mask = 1; mask < 16; mask++) {
    const sizes = SCREEN_SIZES.filter((_, i) => mask & (1 << i)).map((s) => s.id);
    if (screenQuery(sizes) === query) return sizes;
  }
  return undefined;
};

/** A short, readable line for a condition in the list. */
const summary = (
  c: VisibilityCondition,
  names: (kind: 'user' | 'entity' | 'area', id: string) => string,
): string => {
  const ent = (id: unknown): string =>
    typeof id === 'string' && id ? names('entity', id) : '(no entity)';
  switch (c.condition) {
    case 'user': {
      const users = asList(c.users);
      return users.length ? users.map((u) => names('user', u)).join(', ') : 'No users chosen';
    }
    case 'screen': {
      const sizes = screenSizes(String(c.media_query ?? ''));
      if (sizes?.length)
        return sizes.map((s) => SCREEN_SIZES.find((x) => x.id === s)?.label).join(', ');
      return String(c.media_query || 'No screen sizes chosen');
    }
    case 'time': {
      const parts = [
        c.after ? `after ${String(c.after)}` : '',
        c.before ? `before ${String(c.before)}` : '',
        asList(c.weekdays)
          .map((d) => titleCase(d))
          .join(', '),
      ].filter(Boolean);
      const overnight = timeWindow(c) === 'overnight' ? ' (overnight)' : '';
      return parts.length ? `${titleCase(parts.join(', '))}${overnight}` : 'Any time';
    }
    case 'location': {
      const bits = [...asList(c.locations).map((l) => (l === 'home' ? 'Home' : l))];
      if (c.away === true) bits.push('Away');
      const target = c.target as Record<string, unknown> | undefined;
      if (target && typeof target === 'object') {
        bits.push(...asList(target.entity_id).map((z) => names('entity', z)));
        // zones reached another way are named by how
        for (const id of asList(target.label_id)) bits.push(`zones labelled ${id}`);
        for (const id of asList(target.area_id)) bits.push(`zones in ${names('area', id)}`);
        for (const id of asList(target.floor_id)) bits.push(`zones on floor ${id}`);
        for (const id of asList(target.device_id)) {
          bits.push(`zones of ${names('entity', `device:${id}`)}`);
        }
      }
      if (bits.length === 0) return 'No places chosen';
      const exclude = (target?.exclude ?? {}) as Record<string, unknown>;
      const less = Object.values(exclude)
        .flatMap((v) => asList(v))
        .map((id) => names('entity', id));
      const match = c.match_mode === 'active_zone' ? ' (as your current zone)' : '';
      return `You are in ${bits.join(' or ')}${match}${less.length ? `, except ${less.join(', ')}` : ''}`;
    }
    case 'state':
    case undefined: {
      const attr = c.attribute ? ` ${String(c.attribute)}` : '';
      const is = c.state !== undefined && c.state !== null;
      const values = asList(is ? c.state : c.state_not);
      const forPart = c.for ? ` for ${typeof c.for === 'string' ? c.for : 'a while'}` : '';
      return `${ent(c.entity ?? asList(c.entity_id)[0])}${attr} ${is ? 'is' : 'is not'} ${values.join(' or ') || '?'}${forPart}`;
    }
    case 'numeric_state': {
      const bits = [
        c.above !== undefined && c.above !== '' ? `above ${String(c.above)}` : '',
        c.below !== undefined && c.below !== '' ? `below ${String(c.below)}` : '',
      ].filter(Boolean);
      const attr = c.attribute ? ` ${String(c.attribute)}` : '';
      return `${ent(c.entity ?? asList(c.entity_id)[0])}${attr} ${bits.join(' and ') || '?'}`;
    }
    case 'template':
      return String(c.value_template || 'No template yet');
    case 'sun': {
      const bits = [
        c.after ? `after ${String(c.after)}` : '',
        c.before ? `before ${String(c.before)}` : '',
      ];
      return titleCase(bits.filter(Boolean).join(', ') || 'No time chosen');
    }
    case 'zone':
      return `${ent(asList(c.entity_id)[0])} is in ${
        asList(c.zone)
          .map((z) => names('entity', z))
          .join(' or ') || '?'
      }`;
    case 'device':
      return `${c.device_id ? names('entity', `device:${String(c.device_id)}`) : 'No device'}${c.type ? `: ${titleCase(String(c.type).replace(/_/g, ' '))}` : ''}`;
    case 'and':
      return 'All of these';
    case 'or':
      return 'Any of these';
    case 'not':
      return 'None of these';
    default:
      return 'Edited as YAML';
  }
};

/** The hour, minute and second of a time string, or undefined if it isn't one. */
export const timeParts = (value: unknown): [string, string, string] | undefined => {
  if (!isValidTimeString(value)) return undefined;
  const [h, m, sec] = (value as string).split(':');
  return [h.padStart(2, '0'), m.padStart(2, '0'), sec === undefined ? '' : sec.padStart(2, '0')];
};

/**
 * How a time condition's After and Before relate: a window that crosses
 * midnight (Before earlier than After), an empty one (the same time), or
 * neither (a normal window, or only one end set).
 */
export const timeWindow = (c: VisibilityCondition): 'overnight' | 'empty' | undefined => {
  const a = timeParts(c.after);
  const b = timeParts(c.before);
  if (!a || !b) return undefined;
  const secs = ([h, m, sec]: [string, string, string]): number =>
    Number(h) * 3600 + Number(m) * 60 + Number(sec || 0);
  if (secs(a) === secs(b)) return 'empty';
  return secs(b) < secs(a) ? 'overnight' : undefined;
};

/** 00 to n-1, zero-padded. */
const range = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => String(i).padStart(2, '0'));
const HOURS = range(24);
const MINUTES = range(60);

/**
 * A labelled time picker in the editor's own style: hour, minute and
 * (optional) second dropdowns, with no browser time picker involved. A blank
 * hour clears the time. A value that isn't a time (from YAML) is shown with
 * an error until a time is picked.
 */
const timeField = (
  label: string,
  value: unknown,
  onChange: (value: string | undefined) => void,
  description?: string,
  error?: string,
): TemplateResult => {
  const parts = timeParts(value);
  const notATime = value !== undefined && value !== '' && parts === undefined;
  const message = notATime ? `${String(value)} is not a time; pick one.` : error;
  const invalid = message !== undefined;
  const [h, m, sec] = parts ?? ['', '', ''];
  const commit = (nh: string, nm: string, ns: string): void => {
    if (!nh) {
      onChange(undefined);
      return;
    }
    onChange([nh, nm || '00', ...(ns ? [ns] : [])].join(':'));
  };
  const select = (
    part: string,
    current: string,
    options: string[],
    blank: string,
    set: (v: string) => void,
    disabled = false,
  ): TemplateResult =>
    html`<select
      class="vis-time-${part}"
      aria-label="${label} ${part}"
      ?disabled=${disabled}
      @change=${(e: Event) => {
        const el = e.target as HTMLSelectElement;
        el.blur();
        set(el.value);
      }}
    >
      <option value="" ?selected=${current === ''}>${blank}</option>
      ${options.map((o) => html`<option value=${o} ?selected=${o === current}>${o}</option>`)}
    </select>`;
  return html`<div class="field ${invalid ? 'invalid' : ''}">
    <span>${label}</span>
    <div class="vis-time">
      ${select('hour', h, HOURS, '--', (v) => commit(v, m, sec))}
      <span class="vis-time-sep">:</span>
      ${select('minute', h ? m : '', MINUTES, '--', (v) => commit(h, v, sec), !h)}
      <span class="vis-time-sep">:</span>
      ${select('second', h ? sec : '', MINUTES, '--', (v) => commit(h, m, v), !h)}
    </div>
    ${message ? html`<span class="field-error">${message}</span>` : nothing}
    ${description ? html`<small class="field-desc">${description}</small>` : nothing}
  </div>`;
};

/** A group of checkboxes under one label, for multi-choice fields. */
const choicesField = (
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string[],
  onChange: (selected: string[]) => void,
  description?: string,
): TemplateResult =>
  html`<div class="field">
    <span>${label}</span>
    <div class="vis-choices">
      ${options.map(
        (o) =>
          html`<label class="vis-choice">
            <input
              type="checkbox"
              .checked=${selected.includes(o.value)}
              @change=${(e: Event) => {
                const on = (e.target as HTMLInputElement).checked;
                onChange(on ? [...selected, o.value] : selected.filter((v) => v !== o.value));
              }}
            />
            <span>${o.label}</span>
          </label>`,
      )}
      ${options.length === 0 ? html`<span class="field-desc">None found.</span>` : nothing}
    </div>
    ${description ? html`<small class="field-desc">${description}</small>` : nothing}
  </div>`;

/** A comma-separated list as text, and back. */
const listText = (v: unknown): string => asList(v).join(', ');
const textList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Moves the condition at `fromParent[oldIndex]` into the list at `toParent`,
 * at `newIndex` (its index once there), returning the new tree and the
 * condition's new path. Moving a group into itself is refused.
 */
export const moveCondition = (
  list: VisibilityCondition[],
  fromParent: number[],
  oldIndex: number,
  toParent: number[],
  newIndex: number,
): { list: VisibilityCondition[]; path: number[] } | null => {
  const from = [...fromParent, oldIndex];
  if (toParent.length >= from.length && from.every((v, i) => toParent[i] === v)) {
    return null;
  }
  let moved: VisibilityCondition | undefined;
  const edit = (
    tree: VisibilityCondition[],
    parent: number[],
    change: (siblings: VisibilityCondition[]) => void,
    depth = 0,
  ): VisibilityCondition[] => {
    if (depth === parent.length) {
      const next = [...tree];
      change(next);
      return next;
    }
    return tree.map((c, i) =>
      i === parent[depth]
        ? { ...c, conditions: edit(childrenOf(c), parent, change, depth + 1) }
        : c,
    );
  };
  const removed = edit(list, fromParent, (siblings) => {
    [moved] = siblings.splice(oldIndex, 1);
  });
  if (!moved) {
    return null;
  }
  // Taking the condition out shifts later siblings (and their subtrees) up one.
  const target = [...toParent];
  const depth = fromParent.length;
  if (
    target.length > depth &&
    fromParent.every((v, i) => target[i] === v) &&
    target[depth] > oldIndex
  ) {
    target[depth] -= 1;
  }
  const node = moved;
  const result = edit(removed, target, (siblings) => {
    siblings.splice(newIndex, 0, node);
  });
  return { list: result, path: [...target, newIndex] };
};

/**
 * The editor's Visibility tab: the sidebar's conditions as a selectable list
 * (groups nest under a guide line, like categories), a form for the selected
 * one, each row's live result for you, drag and drop, and the whole list as
 * YAML. Every Home Assistant condition type has a form; an integration's
 * condition is edited in the tab's YAML.
 */
export class VisibilityTab implements ReactiveController {
  /** The selected condition's path, as a dotted string, or null. */
  private _selected: string | null = null;
  /** Whether the whole list is being edited as YAML. */
  private _yamlAll = false;
  /** The open popup: the add menu, or the tab or condition menu. */
  private _menu: { kind: 'add' | 'tab'; rect: DOMRect; items?: MenuItem[] } | null = null;
  /** User names by id, once fetched. */
  private _users?: Array<{ id: string; name: string }>;
  /** Screen conditions (by path) switched to a custom media query. */
  private _customScreen = new Set<string>();
  /** Device conditions by device id, once fetched. */
  private _deviceConditions = new Map<string, Array<Record<string, unknown>>>();
  /** Live results for rows Home Assistant checks, by the condition's JSON. */
  private _rowEvals = new Map<string, VisibilityEvaluator>();
  /** The rows' evaluators used in the latest render, to drop the rest. */
  private _usedEvals = new Set<string>();
  /** Condition lists already wired for drag and drop. */
  private _sortables = new WeakSet<HTMLElement>();
  /** The node just before the row being dragged, to put it back for Lit. */
  private _dragMarker: Node | null = null;

  /** Hooks the tab to its editor. */
  public constructor(private readonly host: VisibilityTabHost) {
    host.addController(this);
  }

  /** Nothing to set up until the tab renders. */
  public hostConnected(): void {}

  /** Wires drag and drop on new lists, and drops unused live results. */
  public hostUpdated(): void {
    for (const el of this.host.renderRoot.querySelectorAll<HTMLElement>('.vis-list')) {
      if (!this._sortables.has(el)) {
        this._sortables.add(el);
        this._wireSort(el);
      }
    }
    for (const [key, ev] of this._rowEvals) {
      if (!this._usedEvals.has(key)) {
        ev.dispose();
        this._rowEvals.delete(key);
      }
    }
    this._usedEvals = new Set();
  }

  /** Drops the live subscriptions when the editor closes. */
  public hostDisconnected(): void {
    for (const ev of this._rowEvals.values()) ev.dispose();
    this._rowEvals.clear();
  }

  /** Lets a list's rows be dragged, within it and into or out of groups. */
  private _wireSort(el: HTMLElement): void {
    Sortable.create(el, {
      group: 'vis-conditions',
      draggable: '.vis-node',
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onStart: (evt) => {
        this._dragMarker = evt.item.previousSibling;
      },
      onEnd: (evt) => this._onDrop(evt),
    });
  }

  /** Applies a drop: puts the row back where Lit left it, then moves the condition. */
  public _onDrop(evt: {
    item: HTMLElement;
    from: HTMLElement;
    to: HTMLElement;
    oldIndex?: number;
    newIndex?: number;
  }): void {
    const marker = this._dragMarker;
    this._dragMarker = null;
    if (marker?.parentNode) {
      marker.parentNode.insertBefore(evt.item, marker.nextSibling);
    }
    const parentOf = (list: HTMLElement): number[] =>
      list.dataset.parent ? list.dataset.parent.split('.').map(Number) : [];
    if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
    if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
    const moved = moveCondition(
      this._list,
      parentOf(evt.from),
      evt.oldIndex,
      parentOf(evt.to),
      evt.newIndex,
    );
    if (moved) {
      this.host.setVisibilityConditions(moved.list);
      this._selected = moved.path.join('.');
      this.host.requestUpdate();
    }
  }

  /** Clears the selection and modes, e.g. when the editor gets a new config. */
  public reset(): void {
    this._selected = null;
    this._yamlAll = false;
    this._menu = null;
    this._customScreen.clear();
  }

  // ---------------------------------------------------------------- tree ops

  /** The working list of conditions. */
  private get _list(): VisibilityCondition[] {
    return this.host.visibilityConditions;
  }

  /** The condition at a path, or undefined. */
  private _get(path: Path): VisibilityCondition | undefined {
    let list = this._list;
    let node: VisibilityCondition | undefined;
    for (const i of path) {
      node = list[i];
      if (!node) return undefined;
      list = childrenOf(node);
    }
    return node;
  }

  /** Rewrites the sibling list that holds `path`'s last index. */
  private _editSiblings(
    parent: Path,
    edit: (list: VisibilityCondition[]) => VisibilityCondition[],
  ): void {
    const rewrite = (list: VisibilityCondition[], depth: number): VisibilityCondition[] => {
      if (depth === parent.length) return edit([...list]);
      return list.map((c, i) =>
        i === parent[depth] ? { ...c, conditions: rewrite(childrenOf(c), depth + 1) } : c,
      );
    };
    this.host.setVisibilityConditions(rewrite(this._list, 0));
  }

  /** Replaces the condition at a path. */
  private _replace(path: Path, next: VisibilityCondition): void {
    this._editSiblings(path.slice(0, -1), (list) => {
      list[path[path.length - 1]] = next;
      return list;
    });
  }

  /** Merges fields into the condition at a path; undefined removes a field. */
  private _patch(path: Path, partial: Record<string, unknown>): void {
    const c = this._get(path);
    if (!c) return;
    const next: VisibilityCondition = { ...c, ...partial };
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined) delete next[k];
    }
    this._replace(path, next);
  }

  /** Inserts a condition into a sibling list and selects it. */
  private _insert(parent: Path, index: number, c: VisibilityCondition): void {
    this._editSiblings(parent, (list) => {
      list.splice(index, 0, c);
      return list;
    });
    this._selected = [...parent, index].join('.');
  }

  /** Deletes the condition at a path. */
  private _remove(path: Path): void {
    this._editSiblings(path.slice(0, -1), (list) => {
      list.splice(path[path.length - 1], 1);
      return list;
    });
    this._selected = null;
  }

  /** Moves a condition up or down among its siblings. */
  private _move(path: Path, delta: number): void {
    const i = path[path.length - 1];
    this._editSiblings(path.slice(0, -1), (list) => {
      const [c] = list.splice(i, 1);
      list.splice(i + delta, 0, c);
      return list;
    });
    this._selected = [...path.slice(0, -1), i + delta].join('.');
  }

  /** How many siblings (itself included) the condition at a path has. */
  private _siblingCount(path: Path): number {
    const parent = path.slice(0, -1);
    return parent.length === 0 ? this._list.length : childrenOf(this._get(parent) ?? {}).length;
  }

  // ---------------------------------------------------------------- lookups

  /** The entity states from hass. */
  private _states(): Record<string, { state: string; attributes?: Record<string, unknown> }> {
    return (this.host.hass?.states ?? {}) as never;
  }

  /** A display name for a user id or an entity id. */
  private _name = (kind: 'user' | 'entity' | 'area', id: string): string => {
    if (kind === 'area') {
      const area = (this.host.hass as unknown as { areas?: Record<string, { name?: string }> })
        ?.areas?.[id];
      return area?.name || id;
    }
    if (kind === 'user') {
      return (
        this._users?.find((u) => u.id === id)?.name ??
        (Object.values(this._states()).find((s) => s.attributes?.user_id === id)?.attributes
          ?.friendly_name as string) ??
        id
      );
    }
    if (id.startsWith('device:')) {
      const d = (
        this.host.hass as unknown as {
          devices?: Record<string, { name?: string; name_by_user?: string }>;
        }
      )?.devices?.[id.slice(7)];
      return d?.name_by_user || d?.name || id.slice(7);
    }
    return (this._states()[id]?.attributes?.friendly_name as string | undefined) ?? id;
  };

  /** Home Assistant's users (admins only can list them), else the people. */
  private _ensureUsers(): void {
    if (this._users || !this.host.hass) return;
    const fromPeople = Object.entries(this._states())
      .filter(([id, s]) => id.startsWith('person.') && typeof s.attributes?.user_id === 'string')
      .map(([, s]) => ({
        id: s.attributes!.user_id as string,
        name: (s.attributes?.friendly_name as string) ?? (s.attributes!.user_id as string),
      }));
    this._users = fromPeople;
    const ws = (this.host.hass as unknown as { callWS?: (m: unknown) => Promise<unknown> }).callWS;
    if (!ws) return;
    void ws({ type: 'config/auth/list' })
      .then((list) => {
        const users = (list as Array<{ id: string; name: string; system_generated?: boolean }>)
          .filter((u) => !u.system_generated)
          .map((u) => ({ id: u.id, name: u.name || u.id }));
        if (users.length) {
          this._users = users;
          this.host.requestUpdate();
        }
      })
      .catch(() => undefined);
  }

  /** Fetches what conditions a device offers, once per device. */
  private _ensureDeviceConditions(deviceId: string): void {
    if (!deviceId || this._deviceConditions.has(deviceId) || !this.host.hass) return;
    this._deviceConditions.set(deviceId, []);
    const ws = (this.host.hass as unknown as { callWS?: (m: unknown) => Promise<unknown> }).callWS;
    void ws?.({ type: 'device_automation/condition/list', device_id: deviceId })
      .then((list) => {
        this._deviceConditions.set(deviceId, (list as Array<Record<string, unknown>>) ?? []);
        this.host.requestUpdate();
      })
      .catch(() => undefined);
  }

  // ---------------------------------------------------------------- render

  /** Renders the whole tab. */
  public render(): TemplateResult {
    const list = this._list;
    const notes = html`
      <div class="tab-notes">
        <p class="tab-note">
          Show the sidebar only when all of these hold. While editing, it always shows.
        </p>
        ${
          list.length > 0
            ? html`<button
                class="tool"
                title="Visibility options"
                aria-label="Visibility options"
                @click=${(e: Event) => this._openMenu(e, 'tab')}
              >
                <ha-icon icon="mdi:dots-vertical"></ha-icon>
              </button>`
            : nothing
        }
      </div>
    `;
    if (list.length === 0 && !this._yamlAll) {
      return html`
        ${notes}
        <div class="empty-state">
          <p class="empty-msg">No conditions, so everyone sees the sidebar.</p>
          ${this._addButton([], 0, 'Add Condition', true)}
        </div>
        ${this._renderMenu()}
      `;
    }
    const editor = this._yamlAll
      ? html`<div class="editor form yaml-mode">
          <div class="form-head"><div class="form-title">Visibility</div></div>
          ${this.host.yamlEditor(
            list,
            (v) =>
              this.host.setVisibilityConditions(
                Array.isArray(v) ? (v as VisibilityCondition[]) : [],
              ),
            (v) => visibilityErrors(v),
          )}
        </div>`
      : html`<div class="editor">${this._renderForm()}</div>`;
    return html`
      ${notes}
      <div class="split">
        ${editor}
        <div class="preview vis-pane">
          <div class="preview-head">
            <span class="preview-title">Conditions</span>
          </div>
          <div class="pv-frame vis-tree" role="tree">${this._renderList(list, [])}</div>
        </div>
      </div>
      ${this._renderMenu()}
    `;
  }

  /**
   * A list of conditions, one draggable node each (its row, and a group's
   * children nested under a guide line).
   */
  private _renderList(list: VisibilityCondition[], parent: Path): TemplateResult {
    return html`<div class="vis-list" data-parent=${parent.join('.')}>
      ${list.map((c, i) => {
        const path = [...parent, i];
        const key = path.join('.');
        const group = isLogical(c);
        return html`<div class="vis-node">
          <div
            class="vis-row ${this._selected === key ? 'selected' : ''} ${c.enabled === false ? 'off' : ''}"
            role="treeitem"
            data-path=${key}
            tabindex="0"
            @click=${() => this._select(key)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._select(key);
              }
            }}
          >
            <ha-icon class="vis-icon" icon=${iconFor(c)}></ha-icon>
            <span class="vis-text">
              <span class="vis-type">${conditionLabel(c)}</span>
              <span class="vis-summary">${summary(c, this._name)}</span>
            </span>
            ${this._rowStatus(c)}
          </div>
          ${
            group
              ? html`<div class="vis-children">${this._renderList(childrenOf(c), path)}</div>`
              : nothing
          }
        </div>`;
      })}
    </div>`;
  }

  /**
   * A row's status: what it still needs, turned off, or whether it holds for
   * you right now (checked here, or by Home Assistant for the conditions only
   * it can check).
   */
  private _rowStatus(c: VisibilityCondition): TemplateResult {
    const problems = visibilityErrors([c]).map((e) =>
      e.replace(/^visibility\[0\]\.?/, '').replace(/^[:\s]+/, ''),
    );
    if (problems.length > 0) {
      return html`<ha-icon
        class="vis-status needs"
        icon="mdi:alert-circle-outline"
        title=${`Needs attention: ${problems.join('; ')}`}
      ></ha-icon>`;
    }
    if (c.enabled === false) {
      return html`<span class="vis-status off" title="Turned off">Off</span>`;
    }
    const ev = this.host.hass ? this._rowEval(c) : undefined;
    const held = ev?.observe([c], this.host.hass as unknown as VisibilityHass);
    if (
      ev?.olderHomeAssistant &&
      evaluateLocally([c], this.host.hass as unknown as VisibilityHass, {
        olderHomeAssistant: true,
      }) === undefined
    ) {
      return html`<ha-icon
        class="vis-status older"
        icon="mdi:update"
        title=${`Needs Home Assistant ${MIN_SERVER_CONDITIONS} or newer to check this, so it is ignored for now`}
      ></ha-icon>`;
    }
    if (held === undefined) {
      return html`<ha-icon
        class="vis-status server"
        icon="mdi:home-assistant"
        title="Waiting for Home Assistant"
      ></ha-icon>`;
    }
    return html`<ha-icon
      class="vis-status ${held ? 'yes' : 'no'}"
      icon=${held ? 'mdi:check-circle' : 'mdi:close-circle-outline'}
      title=${held ? 'Holds right now' : 'Does not hold right now'}
    ></ha-icon>`;
  }

  /**
   * The live evaluator for one row, run exactly as the sidebar would (asking
   * Home Assistant, live, for what only it can answer, while the editor is
   * open).
   */
  private _rowEval(c: VisibilityCondition): VisibilityEvaluator {
    const key = JSON.stringify(c);
    this._usedEvals.add(key);
    let ev = this._rowEvals.get(key);
    if (!ev) {
      ev = new VisibilityEvaluator(() => this.host.requestUpdate());
      this._rowEvals.set(key, ev);
    }
    return ev;
  }

  /** Selects a row. */
  private _select(key: string): void {
    if (this._selected !== key) {
      this._selected = key;
      this.host.requestUpdate();
    }
  }

  // ---------------------------------------------------------------- menus

  /** The add menu: every type, grouped, inserting at the given place. */
  private _addItems(parent: Path, index: number): MenuItem[] {
    return ADD_GROUPS.flatMap(([header, types]) => [
      { label: header, run: () => undefined, header: true },
      ...types.map((t) => ({
        label: TYPE_META[t].label,
        run: () => this._insert(parent, index, blank(t)),
      })),
    ]);
  }

  /** An add trigger that opens the type menu for the given place. */
  private _addButton(parent: Path, index: number, label: string, solid = false): TemplateResult {
    return html`<button
      class="add ${solid ? 'solid' : ''}"
      @click=${(e: Event) => {
        e.stopPropagation();
        this._menu = {
          kind: 'add',
          rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
          items: this._addItems(parent, index),
        };
        this.host.requestUpdate();
      }}
    >
      ${label}
    </button>`;
  }

  /** Opens the tab's options menu under its trigger. */
  private _openMenu(e: Event, kind: 'tab'): void {
    e.stopPropagation();
    this._menu = { kind, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() };
    this.host.requestUpdate();
  }

  /** Closes whichever menu is open. */
  private _closeMenu = (): void => {
    this._menu = null;
    this.host.requestUpdate();
  };

  /** The open menu, if any. */
  private _renderMenu(): TemplateResult | typeof nothing {
    const m = this._menu;
    if (!m) return nothing;
    if (m.kind === 'add') {
      return popupMenu(m.rect, m.items ?? [], this._closeMenu);
    }
    const item = (label: string, run: () => void): TemplateResult =>
      html`<button
        class="add-menu-item"
        @click=${() => {
          run();
          this._closeMenu();
        }}
      >
        ${label}
      </button>`;
    const items = html`
      ${item(this._yamlAll ? 'Edit With UI' : 'Edit As YAML', () => {
        this._yamlAll = !this._yamlAll;
      })}
      ${item('Remove All Conditions', () => {
        this.host.setVisibilityConditions([]);
        this.reset();
      })}
    `;
    return html`
      <div class="menu-scrim" @click=${this._closeMenu}></div>
      <div class="add-menu" style=${menuStyle(m.rect, 'right')}>${items}</div>
    `;
  }

  // ---------------------------------------------------------------- form

  /** The selected path, if it still points at a condition. */
  private _path(): Path | null {
    if (this._selected === null) return null;
    const path = this._selected.split('.').map(Number);
    return this._get(path) ? path : null;
  }

  /** The selected condition's form, or the empty prompt. */
  private _renderForm(): TemplateResult {
    const path = this._path();
    const c = path ? this._get(path) : undefined;
    if (!path || !c) {
      return html`<div class="empty-state">
        <ha-icon class="empty-icon" icon="mdi:eye-check-outline"></ha-icon>
        <p class="empty-msg">Select a condition to edit it, or add one.</p>
        ${this._addButton([], this._list.length, 'Add Condition', true)}
      </div>`;
    }
    const index = path[path.length - 1];
    const count = this._siblingCount(path);
    const label = conditionLabel(c);
    const known = c.condition === undefined || c.condition in TYPE_META;
    const body = known ? this._fields(c, path) : nothing;
    return html`
      <div class="form">
        <div class="form-head">
          <div class="form-title">Condition: ${label}</div>
          <div class="form-tools">
            <button
              class="tool"
              title="Move up"
              aria-label="Move up"
              ?disabled=${index <= 0}
              @click=${() => this._move(path, -1)}
            >
              <ha-icon icon="mdi:arrow-up"></ha-icon>
            </button>
            <button
              class="tool"
              title="Move down"
              aria-label="Move down"
              ?disabled=${index >= count - 1}
              @click=${() => this._move(path, 1)}
            >
              <ha-icon icon="mdi:arrow-down"></ha-icon>
            </button>
          </div>
        </div>
        ${
          !known
            ? html`<small class="field-desc">
                An integration's condition, checked by Home Assistant. Edit it with the tab's Edit
                As YAML.
              </small>`
            : nothing
        }
        ${body}
        <div class="form-actions">
          ${isLogical(c) ? this._addButton(path, childrenOf(c).length, 'Add Inside', true) : nothing}
          ${this._addButton(path.slice(0, -1), index + 1, 'Add After', true)}
          <button
            class="add-btn"
            @click=${() => this._patch(path, { enabled: c.enabled === false ? undefined : false })}
          >
            ${c.enabled === false ? 'Turn On' : 'Turn Off'}
          </button>
          <button class="add-btn danger" @click=${() => this._remove(path)}>
            Delete Condition
          </button>
        </div>
      </div>
    `;
  }

  /** The fields for one condition type. */
  private _fields(c: VisibilityCondition, path: Path): TemplateResult {
    const patch = (p: Record<string, unknown>): void => this._patch(path, p);
    const hass = this.host.hass;
    switch (c.condition) {
      case 'user':
        return this._userFields(c, patch);
      case 'screen':
        return this._screenFields(c, patch);
      case 'time':
        return html`
          ${timeField('After', c.after, (v) => patch({ after: v }), 'From this time on. Empty means from midnight.')}
          ${timeField(
            'Before',
            c.before,
            (v) => patch({ before: v }),
            timeWindow(c) === 'overnight'
              ? `Overnight: from ${String(c.after)} until ${String(c.before)} the next day.`
              : 'Until this time. Earlier than After crosses midnight.',
            timeWindow(c) === 'empty' ? 'Must differ from After.' : undefined,
          )}
          ${choicesField(
            'Days',
            WEEKDAYS.map(([value, label]) => ({ value, label })),
            asList(c.weekdays),
            (v) =>
              patch({
                weekdays: v.length
                  ? WEEKDAYS.map(([d]) => d).filter((d) => v.includes(d))
                  : undefined,
              }),
            'None means every day.',
          )}
        `;
      case 'location':
        return this._locationFields(c, patch);
      case 'state':
      case undefined:
        return this._stateFields(c, patch);
      case 'numeric_state':
        return html`
          ${this._entityAndAttribute(c, patch)}
          ${textField('Above', c.above === undefined ? '' : String(c.above), (v) => patch({ above: numOrRef(v) }), undefined, 'A number, or an entity whose state is one.')}
          ${textField('Below', c.below === undefined ? '' : String(c.below), (v) => patch({ below: numOrRef(v) }), undefined, 'Both are strict: the value must be past them.')}
        `;
      case 'template':
        return codeField(
          'Template',
          c.value_template as string | undefined,
          (v) => patch({ value_template: v }),
          hass,
          {
            entities: true,
            description: 'Shows while this renders true. Home Assistant checks it live.',
          },
        );
      case 'sun':
        return html`
          ${selectField('After', (c.after as string) ?? '', [{ label: '(none)', value: '' }, 'sunrise', 'sunset'], (v) => patch({ after: v || undefined, after_offset: v ? c.after_offset : undefined }))}
          ${c.after ? textField('After Offset', (c.after_offset as string) ?? '', (v) => patch({ after_offset: v || undefined }), undefined, 'Like -01:00:00 for an hour before.') : nothing}
          ${selectField('Before', (c.before as string) ?? '', [{ label: '(none)', value: '' }, 'sunrise', 'sunset'], (v) => patch({ before: v || undefined, before_offset: v ? c.before_offset : undefined }))}
          ${c.before ? textField('Before Offset', (c.before_offset as string) ?? '', (v) => patch({ before_offset: v || undefined }), undefined, 'Like 00:30:00 for half an hour after.') : nothing}
        `;
      case 'zone':
        return html`
          ${entityField('Person or Tracker', asList(c.entity_id)[0], (v) => patch({ entity_id: v || undefined }), hass, 'Whose location to check.')}
          ${choicesField('Zones', this._zones(), asList(c.zone), (v) => patch({ zone: v.length > 1 ? v : v[0] }), 'In any of these.')}
        `;
      case 'device':
        return this._deviceFields(c, path);
      case 'and':
      case 'or':
      case 'not':
        return html`
          ${selectField(
            'Group',
            c.condition,
            [
              { label: 'And: all of these', value: 'and' },
              { label: 'Or: any of these', value: 'or' },
              { label: 'Not: none of these', value: 'not' },
            ],
            (v) => patch({ condition: v }),
            { description: 'Add the conditions it combines with Add Inside.' },
          )}
        `;
      default:
        return nothing as unknown as TemplateResult;
    }
  }

  /** Every zone, by name. */
  private _zones(): Array<{ value: string; label: string }> {
    return Object.entries(this._states())
      .filter(([id]) => id.startsWith('zone.'))
      .map(([id, s]) => ({ value: id, label: (s.attributes?.friendly_name as string) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /** User checkboxes, by name, stored as ids. */
  private _userFields(
    c: VisibilityCondition,
    patch: (p: Record<string, unknown>) => void,
  ): TemplateResult {
    this._ensureUsers();
    const selected = asList(c.users);
    const known = this._users ?? [];
    const options = [
      ...known.map((u) => ({ value: u.id, label: u.name })),
      ...selected
        .filter((id) => !known.some((u) => u.id === id))
        .map((id) => ({ value: id, label: id })),
    ];
    return choicesField(
      'Users',
      options,
      selected,
      (v) => patch({ users: v }),
      'Shown only to these users.',
    );
  }

  /** Screen sizes as Home Assistant offers them, or a custom media query. */
  private _screenFields(
    c: VisibilityCondition,
    patch: (p: Record<string, unknown>) => void,
  ): TemplateResult {
    const query = String(c.media_query ?? '');
    const sizes = screenSizes(query);
    const key = this._selected ?? '';
    // custom stays custom even while the query happens to match a preset
    const custom = sizes === undefined || this._customScreen.has(key);
    return html`
      ${selectField(
        'Match',
        custom ? 'custom' : 'sizes',
        [
          { label: 'Screen sizes', value: 'sizes' },
          { label: 'Custom media query', value: 'custom' },
        ],
        (v) => {
          if (v === 'custom') {
            this._customScreen.add(key);
            patch({ media_query: query || '(min-width: 1024px)' });
          } else {
            this._customScreen.delete(key);
            patch({ media_query: screenQuery(screenSizes(query) ?? []) });
          }
        },
      )}
      ${
        custom
          ? textField(
              'Media Query',
              query,
              (v) => patch({ media_query: v }),
              undefined,
              'Any CSS media query, like (orientation: portrait).',
            )
          : choicesField(
              'Sizes',
              SCREEN_SIZES.map((s) => ({
                value: s.id,
                label: `${s.label} (${s.min}px+)`,
              })),
              sizes,
              (v) => patch({ media_query: screenQuery(v) }),
              'Same sizes as Home Assistant’s Screen condition.',
            )
      }
    `;
  }

  /** Where you are (locations, away) or which zones you are in (target). */
  private _locationFields(
    c: VisibilityCondition,
    patch: (p: Record<string, unknown>) => void,
  ): TemplateResult {
    const target = (c.target ?? {}) as Record<string, unknown>;
    const zonesMode = c.target !== undefined;
    const zones = this._zones();
    const placeNames = [
      { value: 'home', label: 'Home' },
      ...zones
        .filter((z) => z.value !== 'zone.home')
        .map((z) => ({ value: z.label, label: z.label })),
    ];
    const extraTarget = Object.keys(target).filter((k) => k !== 'entity_id');
    return html`
      ${selectField(
        'Check',
        zonesMode ? 'zones' : 'state',
        [
          { label: 'Where you are', value: 'state' },
          { label: 'Which zones you are in', value: 'zones' },
        ],
        (v) =>
          patch(
            v === 'zones'
              ? {
                  locations: undefined,
                  away: undefined,
                  target: { entity_id: [] },
                  match_mode: undefined,
                }
              : { target: undefined, match_mode: undefined, locations: [] },
          ),
        { description: 'Zones can overlap; where you are is the one zone your person shows.' },
      )}
      ${
        zonesMode
          ? html`
              ${choicesField('Zones', zones, asList(target.entity_id), (v) => patch({ target: { ...target, entity_id: v } }))}
              ${selectField(
                'Match',
                (c.match_mode as string) ?? 'any_zone',
                [
                  { label: 'In any of them', value: 'any_zone' },
                  { label: 'Only as your current zone', value: 'active_zone' },
                ],
                (v) => patch({ match_mode: v === 'any_zone' ? undefined : v }),
              )}
              ${extraTarget.length ? html`<small class="field-desc">Also targets ${extraTarget.join(', ')} (edit as YAML).</small>` : nothing}
            `
          : html`
              ${choicesField('Places', placeNames, asList(c.locations), (v) => patch({ locations: v.length ? v : undefined }))}
              ${checkboxField('Away', c.away === true, (v) => patch({ away: v || undefined }), 'Also when you are in no zone.')}
            `
      }
    `;
  }

  /** The entity and optional attribute fields shared by State and Numeric State. */
  private _entityAndAttribute(
    c: VisibilityCondition,
    patch: (p: Record<string, unknown>) => void,
  ): TemplateResult {
    const core = 'entity_id' in c;
    const entity = core ? asList(c.entity_id)[0] : (c.entity as string | undefined);
    const attrs = Object.keys(this._states()[entity ?? '']?.attributes ?? {}).sort();
    const attr = (c.attribute as string | undefined) ?? '';
    return html`
      ${entityField('Entity', entity, (v) => patch(core ? { entity_id: v } : { entity: v }), this.host.hass)}
      ${selectField(
        'Attribute',
        attr,
        [
          { label: '(state)', value: '' },
          ...[...new Set([...attrs, ...(attr ? [attr] : [])])].map((a) => ({ label: a, value: a })),
        ],
        (v) => patch({ attribute: v || undefined }),
        { description: 'Compare an attribute instead of the state.' },
      )}
    `;
  }

  /** Entity, attribute, is / is not, states, and an optional duration. */
  private _stateFields(
    c: VisibilityCondition,
    patch: (p: Record<string, unknown>) => void,
  ): TemplateResult {
    const isNot = (c.state === undefined || c.state === null) && c.state_not !== undefined;
    const values = isNot ? c.state_not : c.state;
    const forValue = typeof c.for === 'string' ? c.for : '';
    return html`
      ${this._entityAndAttribute(c, patch)}
      ${selectField(
        'Match',
        isNot ? 'not' : 'is',
        [
          { label: 'Is', value: 'is' },
          { label: 'Is not', value: 'not' },
        ],
        (v) =>
          patch(
            v === 'not'
              ? { state: undefined, state_not: values ?? '' }
              : { state_not: undefined, state: values ?? '' },
          ),
      )}
      ${textField(
        'States',
        listText(values),
        (v) => {
          const list = textList(v);
          const value = list.length > 1 ? list : (list[0] ?? '');
          patch(isNot ? { state_not: value } : { state: value });
        },
        undefined,
        'Separate several with commas. An entity id compares to its state.',
      )}
      ${textField(
        'For At Least',
        forValue,
        (v) => {
          // `for` is core-only, so the condition moves to core's entity_id form.
          if (v) {
            const entity = c.entity ?? c.entity_id;
            patch({ for: v, entity: undefined, entity_id: entity });
          } else {
            patch({ for: undefined });
          }
        },
        undefined,
        'Optional, like 00:05:00. Home Assistant then checks it.',
      )}
    `;
  }

  /** A device, then one of the conditions it offers. */
  private _deviceFields(c: VisibilityCondition, path: Path): TemplateResult {
    const devices = Object.entries(
      (
        this.host.hass as unknown as {
          devices?: Record<string, { name?: string; name_by_user?: string }>;
        }
      )?.devices ?? {},
    )
      .map(([id, d]) => ({ value: id, label: d.name_by_user || d.name || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const deviceId = (c.device_id as string) ?? '';
    this._ensureDeviceConditions(deviceId);
    const options = this._deviceConditions.get(deviceId) ?? [];
    const keyOf = (o: Record<string, unknown>): string =>
      JSON.stringify([o.domain, o.type, o.subtype ?? null, o.entity_id ?? null]);
    const current = c.type ? keyOf(c) : '';
    return html`
      ${selectField(
        'Device',
        deviceId,
        [{ label: '(choose a device)', value: '' }, ...devices],
        (v) => this._replace(path, { condition: 'device', device_id: v || undefined }),
      )}
      ${
        deviceId
          ? selectField(
              'Condition',
              current,
              [
                { label: options.length ? '(choose one)' : 'Loading…', value: '' },
                ...options.map((o) => ({
                  value: keyOf(o),
                  label: [
                    titleCase(String(o.type ?? '').replace(/_/g, ' ')),
                    o.subtype,
                    o.entity_id ? this._name('entity', String(o.entity_id)) : '',
                  ]
                    .filter(Boolean)
                    .join(': '),
                })),
                ...(current && !options.some((o) => keyOf(o) === current)
                  ? [{ label: String(c.type), value: current }]
                  : []),
              ],
              (v) => {
                const chosen = options.find((o) => keyOf(o) === v);
                if (chosen) {
                  this._replace(path, { ...chosen, condition: 'device', device_id: deviceId });
                }
              },
              { description: 'What the device offers. Extra options are in YAML.' },
            )
          : nothing
      }
    `;
  }
}

/** A number typed as text stays a number; anything else (an entity id) stays text. */
const numOrRef = (v: string): number | string | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? t : n;
};
