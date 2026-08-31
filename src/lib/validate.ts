import {
  ALIGNS,
  BLOCK_FIELDS,
  FOOTER_BUTTON_FIELDS,
  FOOTER_FIELDS,
  TOP_FIELDS,
  MOBILE_FIELDS,
  MOBILE_LABELS,
  MOBILE_OVERRIDE_FIELDS,
} from './schema.generated';
import type {
  DashboardSidebarConfig,
  ItemBlock,
  MobileOverride,
  MobileUseEntry,
  SidebarBlock,
} from './types';

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

/**
 * Validates the styling hooks (`class`, `card_mod`) and the required `id`.
 */
const checkHooks = (block: unknown, ctx: string, errors: string[]): void => {
  const b = block as { class?: unknown; id?: unknown; card_mod?: unknown };
  checkString(b.class, `${ctx}.class`, errors);
  if (b.id === undefined || b.id === '') {
    errors.push(`${ctx}: needs a unique id (the editor generates one for new elements)`);
  } else {
    checkString(b.id, `${ctx}.id`, errors);
  }
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
  if (!footer || typeof footer !== 'object') {
    errors.push(`${ctx}: must be a mapping`);
    return;
  }
  unknownKeys(footer, FOOTER_KEYS, ctx, errors);
  const f = footer as {
    divider?: unknown;
    buttons?: unknown;
    card?: unknown;
    markdown?: unknown;
  };
  checkBool(f.divider, `${ctx}.divider`, errors);
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

/** Keys a mobile override (or the patch part of a use entry) may set. */
const MOBILE_OVERRIDE_KEYS = new Set<string>(MOBILE_OVERRIDE_FIELDS);

/** The element kinds that can appear on the mobile bar. */
type BarKind = 'item' | 'category' | 'button' | 'divider' | 'clock' | 'date';

/**
 * Maps every element id to what kind of element carries it, so mobile
 * references can be resolved and their eligibility checked.
 */
export const barEligibility = (config: DashboardSidebarConfig): Map<string, BarKind | 'other'> => {
  const kinds = new Map<string, BarKind | 'other'>();
  const put = (el: unknown, kind: BarKind | 'other'): void => {
    const id = (el as { id?: unknown })?.id;
    if (typeof id === 'string' && id) {
      kinds.set(id, kind);
    }
  };
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  for (const block of [...list(config.header), ...list(config.body)]) {
    const type = (block as { type?: string }).type ?? 'item';
    const barKinds = ['item', 'category', 'divider', 'clock', 'date'];
    put(block, barKinds.includes(type) ? (type as BarKind) : 'other');
    if (type === 'category') {
      for (const child of list((block as { items?: unknown[] }).items)) {
        put(child, 'item');
      }
    }
  }
  for (const btn of list(config.footer?.buttons)) {
    put(btn, 'button');
  }
  return kinds;
};

/**
 * Reports an unknown or bar-ineligible reference, listing what is known.
 */
const checkRef = (
  id: string,
  kinds: Map<string, BarKind | 'other'>,
  ctx: string,
  errors: string[],
  anyKind = false,
): void => {
  const kind = kinds.get(id);
  if (kind === undefined) {
    const known = anyKind
      ? [...kinds.keys()]
      : [...kinds.keys()].filter((k) => kinds.get(k) !== 'other');
    errors.push(`${ctx}: unknown id "${id}" (known: ${known.join(', ') || 'none'})`);
  } else if (kind === 'other' && !anyKind) {
    errors.push(
      `${ctx}: "${id}" is not bar-eligible; only items, categories, dividers, clocks, dates, and footer buttons can appear on the bar`,
    );
  }
};

/**
 * Validates an override patch: allowed keys only, with light type checks.
 */
const checkOverridePatch = (patch: unknown, ctx: string, errors: string[]): void => {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    errors.push(`${ctx}: must be a mapping of properties to replace`);
    return;
  }
  for (const key of Object.keys(patch)) {
    if (key !== 'use' && !MOBILE_OVERRIDE_KEYS.has(key)) {
      errors.push(`${ctx}.${key}: not an overridable property`);
    }
  }
  const p = patch as MobileOverride;
  checkString(p.title, `${ctx}.title`, errors);
  checkString(p.icon, `${ctx}.icon`, errors);
  checkString(p.abbr, `${ctx}.abbr`, errors);
  checkString(p.text_color, `${ctx}.text_color`, errors);
  checkString(p.icon_color, `${ctx}.icon_color`, errors);
  checkString(p.entity, `${ctx}.entity`, errors);
  checkString(p.class, `${ctx}.class`, errors);
  checkBool(p.active_highlight, `${ctx}.active_highlight`, errors);
  checkMapping(p.card_mod, `${ctx}.card_mod`, errors);
};

/**
 * Validates the mobile bar config: known keys, mode exclusivity, resolvable
 * and bar-eligible references, patch shapes, and the bar options.
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
  unknownKeys(mobile, MOBILE_KEYS, 'mobile', errors);
  if (config.hide_on_mobile) {
    errors.push(
      'mobile: cannot be combined with hide_on_mobile (a mobile config already hides the sidebar and shows the bar)',
    );
  }

  const explicit = mobile.items !== undefined;
  if (explicit && (mobile.hide !== undefined || mobile.override !== undefined)) {
    errors.push(
      'mobile: `items` defines the whole bar; `hide`/`override` only apply in derive mode',
    );
  }

  if (
    mobile.breakpoint !== undefined &&
    (typeof mobile.breakpoint !== 'number' || mobile.breakpoint <= 0)
  ) {
    errors.push('mobile.breakpoint: must be a positive number of pixels');
  }
  if (
    mobile.labels !== undefined &&
    !(MOBILE_LABELS as readonly string[]).includes(mobile.labels)
  ) {
    errors.push(`mobile.labels: must be one of ${MOBILE_LABELS.join(', ')}`);
  }
  if (mobile.position !== undefined && mobile.position !== 'top' && mobile.position !== 'bottom') {
    errors.push('mobile.position: must be "top" or "bottom"');
  }
  checkString(mobile.background, 'mobile.background', errors);
  checkMapping(mobile.card_mod, 'mobile.card_mod', errors);

  const kinds = barEligibility(config);

  if (mobile.hide !== undefined) {
    if (!Array.isArray(mobile.hide)) {
      errors.push('mobile.hide: must be a list of element ids');
    } else {
      mobile.hide.forEach((id, i) => {
        if (typeof id !== 'string' || !id) {
          errors.push(`mobile.hide[${i}]: must be an element id`);
        } else {
          checkRef(id, kinds, `mobile.hide[${i}]`, errors);
          if (mobile.override && Object.prototype.hasOwnProperty.call(mobile.override, id)) {
            errors.push(`mobile.hide[${i}]: "${id}" is both hidden and overridden; pick one`);
          }
        }
      });
    }
  }

  if (mobile.override !== undefined) {
    if (!mobile.override || typeof mobile.override !== 'object' || Array.isArray(mobile.override)) {
      errors.push('mobile.override: must be a mapping of element id to properties');
    } else {
      for (const [id, patch] of Object.entries(mobile.override)) {
        checkRef(id, kinds, `mobile.override.${id}`, errors);
        checkOverridePatch(patch, `mobile.override.${id}`, errors);
      }
    }
  }

  if (explicit) {
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
      if ('use' in entry) {
        const use = (entry as MobileUseEntry).use;
        if (typeof use !== 'string' || !use) {
          errors.push(`${ctx}.use: must be an element id`);
        } else {
          checkRef(use, kinds, `${ctx}.use`, errors);
        }
        checkOverridePatch(entry, ctx, errors);
      } else {
        validateItem(entry as ItemBlock, ctx, errors);
      }
    });
  }

  if (mobile.footer !== undefined) {
    if (!Array.isArray(mobile.footer)) {
      errors.push('mobile.footer: must be a list');
      return;
    }
    mobile.footer.forEach((entry, i) => {
      const ctx = `mobile.footer[${i}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${ctx}: must be a mapping`);
        return;
      }
      if ('use' in entry) {
        const use = (entry as MobileUseEntry).use;
        if (typeof use !== 'string' || !use) {
          errors.push(`${ctx}.use: must be an element id`);
        } else {
          const kind = kinds.get(use);
          if (kind === undefined) {
            errors.push(
              `${ctx}.use: unknown id "${use}" (known: ${[...kinds.keys()].join(', ') || 'none'})`,
            );
          } else if (kind !== 'item' && kind !== 'button') {
            errors.push(
              `${ctx}.use: "${use}" cannot be a footer-strip button; only items and footer buttons can`,
            );
          }
        }
        checkOverridePatch(entry, ctx, errors);
      } else {
        validateItem(entry as ItemBlock, ctx, errors);
      }
    });
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
      if ('use' in entry) {
        const use = (entry as MobileUseEntry).use;
        if (typeof use !== 'string' || !use) {
          errors.push(`${ctx}.use: must be an element id`);
        } else {
          checkRef(use, kinds, `${ctx}.use`, errors, true);
        }
        checkOverridePatch(entry, ctx, errors);
      } else {
        const type = (entry as SidebarBlock).type;
        if (type === undefined || type === 'item') {
          validateItem(entry as ItemBlock, ctx, errors);
        } else {
          validateBlock(entry as SidebarBlock, ctx, errors);
        }
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
  unknownKeys(config, TOP_KEYS, 'dashboard_sidebar', errors);
  if (config.position !== undefined && config.position !== 'left' && config.position !== 'right') {
    errors.push('position: must be "left" or "right"');
  }
  if (config.width !== undefined && typeof config.width !== 'number') {
    errors.push('width: must be a number');
  }
  checkBool(c.start_collapsed, 'start_collapsed', errors);
  checkBool(c.overlay, 'overlay', errors);
  checkBool(c.hide_on_mobile, 'hide_on_mobile', errors);
  checkBool(c.hide_on_desktop, 'hide_on_desktop', errors);
  if (config.hide_on_desktop && config.hide_on_mobile) {
    errors.push(
      'hide_on_desktop: cannot be combined with hide_on_mobile (nothing would ever render)',
    );
  }
  checkMapping(c.card_mod, 'card_mod', errors);
  validateRegion(config.header, 'header', errors);
  validateRegion(config.body, 'body', errors);
  if (config.header === undefined && config.body === undefined) {
    errors.push('dashboard_sidebar: needs a header or body with at least one block');
  }
  validateFooter(config.footer, 'footer', errors);
  validateMobile(config, errors);
  checkUniqueIds(config, errors);
  return errors;
};

/**
 * Reports duplicate element ids across header and body blocks, items nested
 * in categories, and footer buttons. Presence is checked per element; this
 * pass only adds the cross-element uniqueness errors.
 */
const checkUniqueIds = (config: DashboardSidebarConfig, errors: string[]): void => {
  const seen = new Map<string, string>();
  const claim = (el: unknown, ctx: string): void => {
    const id = (el as { id?: unknown })?.id;
    if (typeof id !== 'string' || !id) {
      return;
    }
    const prior = seen.get(id);
    if (prior) {
      errors.push(`${ctx}: id "${id}" is already used by ${prior}; ids must be unique`);
    } else {
      seen.set(id, ctx);
    }
  };
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  (['header', 'body'] as const).forEach((region) => {
    list(config[region]).forEach((block, i) => {
      const ctx = `${region}[${i}]`;
      claim(block, ctx);
      list((block as { items?: unknown[] }).items).forEach((child, j) => {
        claim(child, `${ctx}.items[${j}]`);
      });
    });
  });
  list(config.footer?.buttons).forEach((btn, i) => {
    claim(btn, `footer.buttons[${i}]`);
  });
  list(config.mobile?.items).forEach((entry, i) => {
    if (entry && typeof entry === 'object' && !('use' in (entry as object))) {
      claim(entry, `mobile.items[${i}]`);
    }
  });
  list(config.mobile?.menu).forEach((entry, i) => {
    if (entry && typeof entry === 'object' && !('use' in (entry as object))) {
      claim(entry, `mobile.menu[${i}]`);
    }
  });
  list(config.mobile?.footer).forEach((entry, i) => {
    if (entry && typeof entry === 'object' && !('use' in (entry as object))) {
      claim(entry, `mobile.footer[${i}]`);
    }
  });
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
