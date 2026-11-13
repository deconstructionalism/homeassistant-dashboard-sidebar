import {
  ALIGNS,
  BLOCK_FIELDS,
  FOOTER_BUTTON_FIELDS,
  FOOTER_FIELDS,
  TOP_FIELDS,
  MOBILE_FIELDS,
  MOBILE_MODES,
} from './schema.generated';
import { hasTarget, isValidTimeString } from './visibility';
import type { DashboardSidebarConfig, ItemBlock, SidebarBlock } from './types';

/** Accepted alignment values, as a set for lookups. */
const ALIGN_SET = new Set<string>(ALIGNS);

/** Recognized keys on the top-level config. */
const TOP_KEYS = new Set<string>(TOP_FIELDS);

/**
 * Legacy clock keys still accepted so old configs do not error. They are not
 * part of the current schema: the clock renderer and the editor fold them into
 * the `format` pattern (see the migration in dashboard-sidebar.ts).
 */
const LEGACY_CLOCK_KEYS = ['hour_format', 'collapsed_format'];

/**
 * Recognized block types, and the keys each one accepts. Field sets come from
 * the generated schema; the clock also tolerates its legacy keys.
 */
const BLOCK_KEYS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(BLOCK_FIELDS).map(([type, fields]) => [
    type,
    new Set<string>(type === 'clock' ? [...fields, ...LEGACY_CLOCK_KEYS] : fields),
  ]),
);

/** Recognized keys on the footer. */
const FOOTER_KEYS = new Set<string>(FOOTER_FIELDS);

/** Recognized keys on a footer button. */
const FOOTER_BUTTON_KEYS = new Set<string>(FOOTER_BUTTON_FIELDS);

/**
 * Reports any keys on `obj` that are not in the `allowed` set, prefixing each
 * message with the config path `ctx`.
 */
const unknownKeys = (obj: object, allowed: Set<string>, ctx: string, errors: string[]): void => {
  Object.keys(obj).forEach((key) => {
    if (!allowed.has(key)) {
      errors.push(`${ctx}: unknown option "${key}"`);
    }
  });
};

/**
 * Records an error when a defined value is not a boolean.
 */
const checkBool = (value: unknown, ctx: string, errors: string[]): void => {
  if (value !== undefined && typeof value !== 'boolean') {
    errors.push(`${ctx}: must be true or false`);
  }
};

/**
 * Records an error when a defined alignment is not left, center, or right.
 */
const checkAlign = (value: unknown, ctx: string, errors: string[]): void => {
  if (value !== undefined && (typeof value !== 'string' || !ALIGN_SET.has(value))) {
    errors.push(`${ctx}: must be left, center, or right`);
  }
};

/**
 * Records an error when a defined value is not a string.
 */
const checkString = (value: unknown, ctx: string, errors: string[]): void => {
  if (value !== undefined && typeof value !== 'string') {
    errors.push(`${ctx}: must be a string`);
  }
};

/**
 * Records an error when `abbr` is set alongside an icon, since the collapsed
 * glyph override only applies when there is no icon to show.
 */
const checkAbbr = (abbr: unknown, icon: unknown, ctx: string, errors: string[]): void => {
  checkString(abbr, `${ctx}.abbr`, errors);
  if (abbr !== undefined && icon !== undefined) {
    errors.push(`${ctx}: abbr is only allowed when icon is not set`);
  }
};

/**
 * Records an error when a defined value is not a plain mapping.
 */
const checkMapping = (value: unknown, ctx: string, errors: string[]): void => {
  if (
    value !== undefined &&
    (typeof value !== 'object' || value === null || Array.isArray(value))
  ) {
    errors.push(`${ctx}: must be a mapping`);
  }
};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const isStr = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isStrList = (v: unknown): boolean =>
  isStr(v) || (Array.isArray(v) && v.length > 0 && v.every(isStr));

/**
 * Validates a visibility condition list with Home Assistant's own rules
 * (its validate-condition.ts), so anything a card's Visibility tab accepts is
 * accepted here: every Lovelace type checked field by field, the core types
 * (template, sun, zone, device, `entity_id` state checks) for the fields they
 * need, and anything else left to Home Assistant, as it does.
 */
const validateVisibility = (
  value: unknown,
  ctx: string,
  errors: string[],
  nested = false,
): void => {
  if (value === undefined) {
    return;
  }
  // a group's conditions may be one condition; the top-level list may not
  if (!nested && !Array.isArray(value)) {
    errors.push(`${ctx}: must be a list of conditions`);
    return;
  }
  const list = Array.isArray(value) ? value : [value];
  list.forEach((raw, i) => {
    const at = Array.isArray(value) ? `${ctx}[${i}]` : ctx;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`${at}: must be a mapping`);
      return;
    }
    const c = raw as Record<string, unknown>;
    const need = (ok: boolean, msg: string): void => {
      if (!ok) errors.push(`${at}${msg}`);
    };
    if (c.enabled !== undefined) {
      need(
        typeof c.enabled === 'boolean' || isStr(c.enabled),
        '.enabled: must be true, false or a template',
      );
    }
    if (c.condition === undefined) {
      // the legacy { entity, state } shape
      need(isStr(c.entity), '.entity: needs an entity id');
      need(c.state != null || c.state_not != null, ': needs state or state_not');
      return;
    }
    if (!isStr(c.condition)) {
      errors.push(`${at}.condition: must be a condition type`);
      return;
    }
    switch (c.condition) {
      case 'user':
        need(Array.isArray(c.users) && c.users.every(isStr), '.users: must be a list of user ids');
        break;
      case 'screen':
        need(isStr(c.media_query), '.media_query: needs a CSS media query');
        break;
      case 'view_columns':
        need(c.min != null || c.max != null, ': needs min or max');
        break;
      case 'time': {
        const hasAfter = c.after != null && c.after !== '';
        const hasBefore = c.before != null && c.before !== '';
        const days =
          c.weekdays === undefined ? [] : Array.isArray(c.weekdays) ? c.weekdays : [c.weekdays];
        need(hasAfter || hasBefore || days.length > 0, ': needs after, before or weekdays');
        need(
          !hasAfter || isValidTimeString(c.after),
          '.after: must be a time like 08:00 or 08:00:00',
        );
        need(
          !hasBefore || isValidTimeString(c.before),
          '.before: must be a time like 08:00 or 08:00:00',
        );
        need(!hasAfter || !hasBefore || c.after !== c.before, ': after and before must differ');
        need(
          days.every((d) => WEEKDAYS.includes(d as string)),
          `.weekdays: must be from ${WEEKDAYS.join(', ')}`,
        );
        break;
      }
      case 'location':
        need(
          c.target === undefined || hasTarget(c.target),
          '.target: needs a zone, area, floor, label or device',
        );
        need(c.away === undefined || typeof c.away === 'boolean', '.away: must be true or false');
        need(
          c.match_mode === undefined ||
            c.match_mode === 'any_zone' ||
            c.match_mode === 'active_zone',
          '.match_mode: must be any_zone or active_zone',
        );
        need(
          c.locations === undefined || (c.target === undefined && c.match_mode === undefined),
          ': use either locations or target, not both',
        );
        need(
          c.locations != null || c.target != null || c.away === true,
          ': needs locations, target or away',
        );
        break;
      case 'state':
      case 'numeric_state': {
        const core = 'entity_id' in c;
        if (core) {
          need(isStrList(c.entity_id), '.entity_id: needs an entity id');
        } else {
          need(isStr(c.entity), '.entity: needs an entity id');
        }
        if (c.condition === 'state') {
          for (const key of ['state', 'state_not'] as const) {
            const v = c[key];
            need(
              v === undefined ||
                ['string', 'number', 'boolean'].includes(typeof v) ||
                (Array.isArray(v) &&
                  v.every((x) => ['string', 'number', 'boolean'].includes(typeof x))),
              `.${key}: must be a state or a list of states`,
            );
          }
          need(c.state != null || c.state_not != null, ': needs state or state_not');
        } else {
          for (const key of ['above', 'below'] as const) {
            need(
              c[key] === undefined || typeof c[key] === 'number' || isStr(c[key]),
              `.${key}: must be a number or an entity id`,
            );
          }
          need(c.above != null || c.below != null, ': needs above or below');
        }
        break;
      }
      case 'template':
        need(isStr(c.value_template), '.value_template: needs a template');
        break;
      case 'sun':
        need(c.after != null || c.before != null, ': needs after or before');
        for (const key of ['after', 'before'] as const) {
          need(
            c[key] === undefined || c[key] === 'sunrise' || c[key] === 'sunset',
            `.${key}: must be sunrise or sunset`,
          );
        }
        break;
      case 'zone':
        need(isStrList(c.entity_id), '.entity_id: needs a person or device tracker');
        need(isStrList(c.zone), '.zone: needs a zone');
        break;
      case 'device':
        need(isStr(c.device_id), '.device_id: needs a device');
        need(isStr(c.domain), '.domain: needs the device integration');
        need(isStr(c.type), '.type: needs a condition type');
        break;
      case 'and':
      case 'or':
      case 'not':
        if (c.conditions == null) {
          errors.push(`${at}.conditions: needs a list of conditions`);
        } else {
          validateVisibility(c.conditions, `${at}.conditions`, errors, true);
        }
        break;
      default:
        // an integration's condition: Home Assistant validates it
        break;
    }
  });
};

/** The problems with a visibility list, as the Visibility tab shows them. */
export const visibilityErrors = (value: unknown): string[] => {
  const errors: string[] = [];
  validateVisibility(value, 'visibility', errors);
  return errors;
};

/**
 * Validates the optional styling hooks (`class`, `id`, `uix`, and `card_mod`).
 * `id` is a pure CSS-targeting hook: nothing reads it back, and it is
 * neither required nor checked for uniqueness.
 */
const checkHooks = (block: unknown, ctx: string, errors: string[]): void => {
  const b = block as { class?: unknown; id?: unknown; uix?: unknown; card_mod?: unknown };
  checkString(b.class, `${ctx}.class`, errors);
  checkString(b.id, `${ctx}.id`, errors);
  checkMapping(b.uix, `${ctx}.uix`, errors);
  checkMapping(b.card_mod, `${ctx}.card_mod`, errors);
};

/**
 * Validates a single item spec: known keys, a title, and a tap_action.
 */
const validateItem = (item: ItemBlock, ctx: string, errors: string[]): void => {
  unknownKeys(item, BLOCK_KEYS.item, ctx, errors);
  if (item.type !== undefined && item.type !== 'item') {
    errors.push(`${ctx}: expected an item`);
  }
  if (typeof item.title !== 'string') {
    errors.push(`${ctx}: needs a title`);
  }
  if (!item.tap_action) {
    errors.push(`${ctx}: needs a tap_action`);
  }
  checkAbbr(item.abbr, item.icon, ctx, errors);
  checkHooks(item, ctx, errors);
  checkBool(
    (item as { active_highlight?: unknown }).active_highlight,
    `${ctx}.active_highlight`,
    errors,
  );
};

/**
 * Validates one header/body block, dispatching on its declared type.
 */
const validateBlock = (block: SidebarBlock, ctx: string, errors: string[]): void => {
  if (!block || typeof block !== 'object') {
    errors.push(`${ctx}: must be a mapping`);
    return;
  }
  const type = (block as { type?: unknown }).type;
  if (typeof type !== 'string' || !(type in BLOCK_KEYS)) {
    errors.push(`${ctx}: needs a valid type (${Object.keys(BLOCK_KEYS).join(', ')})`);
    return;
  }
  unknownKeys(block, BLOCK_KEYS[type], ctx, errors);
  if (type !== 'item') {
    checkHooks(block, ctx, errors);
    checkBool(
      (block as { active_highlight?: unknown }).active_highlight,
      `${ctx}.active_highlight`,
      errors,
    );
  }

  switch (type) {
    case 'title':
      if (typeof (block as { text?: unknown }).text !== 'string') {
        errors.push(`${ctx}: title needs text`);
      }
      checkAlign((block as { align?: unknown }).align, `${ctx}.align`, errors);
      break;
    case 'clock': {
      const rec = block as unknown as Record<string, unknown>;
      // format accepts a 12h/24h convention or any strftime pattern; unknown
      // tokens render literally, so they are not validated for token type.
      for (const key of ['hour_format', 'collapsed_format'] as const) {
        const val = rec[key];
        if (val !== undefined && !['12h', '24h'].includes(String(val))) {
          errors.push(`${ctx}.${key}: must be "12h" or "24h"`);
        }
      }
      checkAlign(rec.align, `${ctx}.align`, errors);
      break;
    }
    case 'date': {
      const rec = block as unknown as Record<string, unknown>;
      checkAlign(rec.align, `${ctx}.align`, errors);
      break;
    }
    case 'divider':
      break;
    case 'item':
      validateItem(block as ItemBlock, ctx, errors);
      break;
    case 'category':
      if (typeof (block as { title?: unknown }).title !== 'string') {
        errors.push(`${ctx}: category needs a title`);
      }
      checkBool(
        (block as { start_collapsed?: unknown }).start_collapsed,
        `${ctx}.start_collapsed`,
        errors,
      );
      checkBool((block as { guide_line?: unknown }).guide_line, `${ctx}.guide_line`, errors);
      checkAbbr(
        (block as { abbr?: unknown }).abbr,
        (block as { icon?: unknown }).icon,
        ctx,
        errors,
      );
      {
        const items = (block as { items?: unknown }).items;
        if (!Array.isArray(items) || items.length === 0) {
          errors.push(`${ctx}: category needs a non-empty items list`);
        } else {
          items.forEach((sub, j) => {
            const subType = (sub as { type?: unknown })?.type;
            if (subType === 'category' || subType === 'divider') {
              errors.push(`${ctx}.items[${j}]: a category can only contain items`);
            } else {
              validateItem(sub as ItemBlock, `${ctx}.items[${j}]`, errors);
            }
          });
        }
      }
      break;
    case 'markdown':
      checkAlign((block as { align?: unknown }).align, `${ctx}.align`, errors);
      if (typeof (block as { content?: unknown }).content !== 'string') {
        errors.push(`${ctx}: markdown needs content`);
      }
      break;
    case 'card':
      checkAlign((block as { align?: unknown }).align, `${ctx}.align`, errors);
      if ((block as { card?: unknown }).card === undefined) {
        errors.push(`${ctx}: card needs a card config`);
      }
      break;
    default:
      break;
  }
};

/**
 * Validates a region (header or body) as a list of blocks.
 */
const validateRegion = (value: unknown, ctx: string, errors: string[]): void => {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${ctx}: must be a list`);
    return;
  }
  value.forEach((block, i) => validateBlock(block as SidebarBlock, `${ctx}[${i}]`, errors));
};

/**
 * Validates the footer: divider flag, and buttons XOR a card.
 */
const validateFooter = (footer: unknown, ctx: string, errors: string[]): void => {
  if (footer === undefined) {
    return;
  }
  if (!footer || typeof footer !== 'object' || Array.isArray(footer)) {
    errors.push(`${ctx}: must be a mapping`);
    return;
  }
  unknownKeys(footer, FOOTER_KEYS, ctx, errors);
  const f = footer as {
    divider?: unknown;
    align?: unknown;
    buttons?: unknown;
    card?: unknown;
    markdown?: unknown;
  };
  checkBool(f.divider, `${ctx}.divider`, errors);
  checkAlign(f.align, `${ctx}.align`, errors);
  checkHooks(footer, ctx, errors);
  const modes = [f.buttons, f.card, f.markdown].filter((v) => v !== undefined).length;
  if (modes > 1) {
    errors.push(`${ctx}: set only one of buttons, card, or markdown`);
  }
  if (f.markdown !== undefined) {
    checkString(f.markdown, `${ctx}.markdown`, errors);
  }
  if (f.buttons !== undefined) {
    if (!Array.isArray(f.buttons)) {
      errors.push(`${ctx}.buttons: must be a list`);
    } else {
      f.buttons.forEach((btn, i) => validateFooterButton(btn, `${ctx}.buttons[${i}]`, errors));
    }
  }
};

/**
 * Validates a single footer button: known keys, an icon, and a tap_action.
 */
const validateFooterButton = (btn: unknown, ctx: string, errors: string[]): void => {
  if (!btn || typeof btn !== 'object') {
    errors.push(`${ctx}: must be a mapping`);
    return;
  }
  unknownKeys(btn, FOOTER_BUTTON_KEYS, ctx, errors);
  if (typeof (btn as { icon?: unknown }).icon !== 'string') {
    errors.push(`${ctx}: needs an icon`);
  }
  if (!(btn as { tap_action?: unknown }).tap_action) {
    errors.push(`${ctx}: needs a tap_action`);
  }
  checkHooks(btn, ctx, errors);
  checkBool(
    (btn as { active_highlight?: unknown }).active_highlight,
    `${ctx}.active_highlight`,
    errors,
  );
};

/** Keys allowed on the mobile config. */
const MOBILE_KEYS = new Set<string>(MOBILE_FIELDS);

/** Accepted `mobile.mode` values. */
const MOBILE_MODE_SET = new Set<string>(MOBILE_MODES);

/**
 * Validates the mobile bar config: known keys, the inline entries of each
 * list, and the bar options.
 */
const validateMobile = (config: DashboardSidebarConfig, errors: string[]): void => {
  const mobile = config.mobile;
  if (mobile === undefined) {
    return;
  }
  if (!mobile || typeof mobile !== 'object' || Array.isArray(mobile)) {
    errors.push('mobile: must be a mapping');
    return;
  }
  unknownKeys(mobile, new Set([...MOBILE_KEYS, 'breakpoint']), 'mobile', errors);

  if (mobile.mode !== undefined && !MOBILE_MODE_SET.has(mobile.mode)) {
    errors.push('mobile.mode: must be "mirror" or "custom"');
  }
  const explicit = mobile.mode === 'custom';
  // A mirrored bar follows the desktop and carries no content of its own, so
  // these keys would silently do nothing there.
  if (!explicit) {
    for (const key of ['items', 'menu', 'footer'] as const) {
      if (mobile[key] !== undefined) {
        errors.push(
          `mobile.${key}: not part of a mirrored bar; set \`mode: custom\` to spell the bar out, or remove it`,
        );
      }
    }
  }

  if ((mobile as Record<string, unknown>).breakpoint !== undefined) {
    errors.push('mobile.breakpoint: moved to the top-level `breakpoint` option');
  }
  checkBool(mobile.labels, 'mobile.labels', errors);
  if (mobile.position !== undefined && mobile.position !== 'top' && mobile.position !== 'bottom') {
    errors.push('mobile.position: must be "top" or "bottom"');
  }
  checkString(mobile.background, 'mobile.background', errors);
  checkMapping(mobile.uix, 'mobile.uix', errors);
  checkMapping(mobile.card_mod, 'mobile.card_mod', errors);

  if (explicit && mobile.items !== undefined) {
    if (!Array.isArray(mobile.items)) {
      errors.push('mobile.items: must be a list');
      return;
    }
    mobile.items.forEach((entry, i) => {
      const ctx = `mobile.items[${i}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${ctx}: must be a mapping`);
        return;
      }
      const type = (entry as SidebarBlock).type;
      if (type === undefined || type === 'item') {
        validateItem(entry as ItemBlock, ctx, errors);
      } else if (['category', 'divider', 'clock', 'date'].includes(type)) {
        validateBlock(entry as SidebarBlock, ctx, errors);
      } else {
        errors.push(
          `${ctx}: type "${type}" is not bar-eligible (items, categories, dividers, clocks, dates)`,
        );
      }
    });
  }

  if (mobile.footer !== undefined) {
    // The mobile footer is the desktop footer's shape, so it validates the
    // same way: a button strip, a card, or markdown.
    validateFooter(mobile.footer, 'mobile.footer', errors);
  }

  if (mobile.menu !== undefined) {
    if (!Array.isArray(mobile.menu)) {
      errors.push('mobile.menu: must be a list');
      return;
    }
    mobile.menu.forEach((entry, i) => {
      const ctx = `mobile.menu[${i}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${ctx}: must be a mapping`);
        return;
      }
      const type = (entry as SidebarBlock).type;
      if (type === undefined || type === 'item') {
        validateItem(entry as ItemBlock, ctx, errors);
      } else {
        validateBlock(entry as SidebarBlock, ctx, errors);
      }
    });
  }
};

/**
 * Validates a full sidebar config and returns every problem found, so the
 * element can surface them all at once. The list is empty when valid.
 */
export const validateConfig = (config: DashboardSidebarConfig): string[] => {
  const errors: string[] = [];
  if (!config || typeof config !== 'object') {
    return ['dashboard_sidebar: config must be a mapping'];
  }
  const c = config as unknown as Record<string, unknown>;
  // Legacy hide keys get a targeted migration message instead of the generic
  // unknown-option error.
  unknownKeys(
    config,
    new Set([...TOP_KEYS, 'hide_on_mobile', 'hide_on_desktop']),
    'dashboard_sidebar',
    errors,
  );
  if (config.position !== undefined && config.position !== 'left' && config.position !== 'right') {
    errors.push('position: must be "left" or "right"');
  }
  if (config.width !== undefined && typeof config.width !== 'number') {
    errors.push('width: must be a number');
  }
  checkBool(c.start_collapsed, 'start_collapsed', errors);
  checkBool(c.overlay, 'overlay', errors);
  if (
    config.on_desktop !== undefined &&
    config.on_desktop !== 'sidebar' &&
    config.on_desktop !== 'hidden'
  ) {
    errors.push('on_desktop: must be "sidebar" or "hidden"');
  }
  if (
    config.on_mobile !== undefined &&
    config.on_mobile !== 'sidebar' &&
    config.on_mobile !== 'bar' &&
    config.on_mobile !== 'hidden'
  ) {
    errors.push('on_mobile: must be "sidebar", "bar", or "hidden"');
  }
  if (config.mobile !== undefined && config.on_mobile !== undefined && config.on_mobile !== 'bar') {
    errors.push('on_mobile: a `mobile` bar config is only used when on_mobile is "bar"');
  }
  if (config.on_desktop === 'hidden' && config.on_mobile === 'hidden') {
    errors.push('on_desktop: hidden on desktop and mobile means nothing would ever render');
  }
  if (
    config.breakpoint !== undefined &&
    (typeof config.breakpoint !== 'number' || config.breakpoint <= 0)
  ) {
    errors.push('breakpoint: must be a positive number of pixels');
  }
  if (c.hide_on_mobile !== undefined) {
    errors.push('hide_on_mobile: replaced by `on_mobile: hidden`');
  }
  if (c.hide_on_desktop !== undefined) {
    errors.push('hide_on_desktop: replaced by `on_desktop: hidden`');
  }
  checkBool(c.animate, 'animate', errors);
  validateVisibility(c.visibility, 'visibility', errors);
  checkMapping(c.uix, 'uix', errors);
  checkMapping(c.card_mod, 'card_mod', errors);
  validateRegion(config.header, 'header', errors);
  validateRegion(config.body, 'body', errors);
  if (config.header === undefined && config.body === undefined) {
    errors.push('dashboard_sidebar: needs a header or body with at least one block');
  }
  validateFooter(config.footer, 'footer', errors);
  validateMobile(config, errors);
  return errors;
};

/**
 * Strips the leading context path (e.g. `element` / `element.align`) from each
 * message, for surfacing single-element errors without the placeholder prefix.
 */
const stripCtx = (errors: string[]): string[] => {
  return errors.map((e) => e.replace(/^element[.:]?\s*/, ''));
};

/**
 * Validates one header/body block against its type's schema, returning the
 * problems found. Used to check a YAML-edited element live.
 */
export const validateBlockConfig = (block: unknown): string[] => {
  const errors: string[] = [];
  validateBlock(block as SidebarBlock, 'element', errors);
  return stripCtx(errors);
};

/**
 * Validates one category child item against the item schema.
 */
export const validateItemConfig = (item: unknown): string[] => {
  const errors: string[] = [];
  const type = (item as { type?: unknown })?.type;
  if (type === 'category' || type === 'divider') {
    errors.push('a category can only contain items');
  } else {
    validateItem(item as ItemBlock, 'element', errors);
  }
  return stripCtx(errors);
};

/**
 * Validates one footer button against the footer-button schema.
 */
export const validateFooterButtonConfig = (btn: unknown): string[] => {
  const errors: string[] = [];
  validateFooterButton(btn, 'element', errors);
  return stripCtx(errors);
};
