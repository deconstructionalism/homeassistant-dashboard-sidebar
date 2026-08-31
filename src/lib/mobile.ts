/**
 * Mobile bar resolution.
 *
 * Turns a validated config into the effective ordered bar: derive mode
 * mirrors the desktop nav (items, categories, clocks, dates, and dividers,
 * in document order) minus
 * `hide` and with `override` patches applied; explicit mode maps the
 * `items` list, resolving `use:` references and passing inline items
 * through. Pure logic, no rendering.
 */

import type {
  CategoryBlock,
  DashboardSidebarConfig,
  FooterButtonConfig,
  ItemBlock,
  MobileConfig,
  MobileOverride,
  MobileUseEntry,
  SidebarBlock,
} from './types';

/** What kind of desktop element a bar entry renders as. */
export type BarEntryKind =
  'item' | 'category' | 'button' | 'divider' | 'clock' | 'date' | 'title' | 'markdown' | 'card';

/** Where a bar entry came from. */
export type BarEntrySource = 'derived' | 'use' | 'inline';

/** The resolved bar: the slot row, and the entries of the trailing menu. */
export interface ResolvedBar {
  /** Elements on the bar itself, in order. Width overflow folds the tail. */
  slots: BarEntry[];
  /** Entries that always live behind the trailing dots menu (footer buttons). */
  menu: BarEntry[];
  /** Curated sheet entries from `mobile.menu`, after the overflowed slots. */
  extras: BarEntry[];
  /** The curated sheet footer strip from `mobile.footer`; empty when unset. */
  footer: BarEntry[];
}

/** One resolved slot of the mobile bar. */
export interface BarEntry {
  /** How the entry reached the bar. */
  source: BarEntrySource;
  /** What it renders as. */
  kind: BarEntryKind;
  /** The element with any mobile patches applied. Categories keep their items. */
  element: ItemBlock | CategoryBlock | FooterButtonConfig | SidebarBlock;
}

/** The subset of a use entry that patches the referenced element. */
const patchOf = (entry: MobileUseEntry): MobileOverride => {
  const patch: Record<string, unknown> = { ...entry };
  delete patch.use;
  return patch as MobileOverride;
};

/** A shallow-merged copy of an element with a mobile patch applied. */
const merged = <T extends object>(element: T, patch?: MobileOverride): T => {
  return patch && Object.keys(patch).length ? { ...element, ...patch } : { ...element };
};

/**
 * A category copy whose children exclude the given hidden ids and carry any
 * per-child overrides.
 */
const mergedCategory = (
  category: CategoryBlock,
  hidden: Set<string>,
  overrides: Record<string, MobileOverride>,
  patch?: MobileOverride,
): CategoryBlock => {
  const items = (category.items ?? [])
    .filter((child) => !(child.id && hidden.has(child.id)))
    .map((child) => merged(child, child.id ? overrides[child.id] : undefined));
  return { ...merged(category, patch), items };
};

/**
 * Resolves the effective mobile bar for a config.
 *
 * @param config - A validated sidebar config with a `mobile` section.
 * @returns The ordered bar entries; empty when there is no mobile config.
 */
/**
 * Resolves the curated `mobile.menu` sheet entries: `use:` references to any
 * element (titles, markdown, and cards included) and inline blocks.
 */
/** An id index of every element in the config, for curated-list resolution. */
const elementIndex = (
  config: DashboardSidebarConfig,
): Map<string, { kind: BarEntryKind; element: SidebarBlock | FooterButtonConfig }> => {
  const all = new Map<string, { kind: BarEntryKind; element: SidebarBlock | FooterButtonConfig }>();
  for (const block of [...(config.header ?? []), ...(config.body ?? [])]) {
    const type = (block.type ?? 'item') as BarEntryKind;
    if (block.id) {
      all.set(block.id, { kind: type, element: block });
    }
    if (type === 'category') {
      for (const child of (block as CategoryBlock).items ?? []) {
        if (child.id) {
          all.set(child.id, { kind: 'item', element: child });
        }
      }
    }
  }
  for (const btn of config.footer?.buttons ?? []) {
    if (btn.id) {
      all.set(btn.id, { kind: 'button', element: btn });
    }
  }
  return all;
};

/** Resolves one curated list (`mobile.menu` / `mobile.footer`) to entries. */
const resolveCurated = (config: DashboardSidebarConfig, entries: unknown): BarEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }
  const all = elementIndex(config);
  const out: BarEntry[] = [];
  for (const entry of entries as (MobileUseEntry | SidebarBlock)[]) {
    if ('use' in entry) {
      const target = all.get(entry.use);
      if (!target) {
        continue; // validation reports this; resolution just skips it
      }
      const patch = patchOf(entry);
      out.push({
        source: 'use',
        kind: target.kind,
        element:
          target.kind === 'category'
            ? mergedCategory(target.element as CategoryBlock, new Set(), {}, patch)
            : merged(target.element, patch),
      });
    } else {
      out.push({
        source: 'inline',
        kind: ((entry as SidebarBlock).type ?? 'item') as BarEntryKind,
        element: { ...entry },
      });
    }
  }
  return out;
};

const resolveExtras = (config: DashboardSidebarConfig, mobile: MobileConfig): BarEntry[] => {
  return resolveCurated(config, mobile.menu);
};

export const resolveBar = (config: DashboardSidebarConfig): ResolvedBar => {
  // A hidden desktop implies a bar even without a mobile section: derive mode
  // with all defaults, so the config still renders somewhere.
  const mobile = config.mobile ?? (config.hide_on_desktop ? {} : undefined);
  if (!mobile) {
    return { slots: [], menu: [], extras: [], footer: [] };
  }
  const extras = resolveExtras(config, mobile);
  const footer = mobile.footer !== undefined ? resolveCurated(config, mobile.footer) : null;
  const hidden = new Set(mobile.hide ?? []);
  const overrides = mobile.override ?? {};
  const blocks = [...(config.header ?? []), ...(config.body ?? [])];

  if (mobile.items === undefined) {
    const slots: BarEntry[] = [];
    for (const block of blocks) {
      const type = block.type ?? 'item';
      if (block.id && hidden.has(block.id)) {
        continue;
      }
      if (type === 'category') {
        slots.push({
          source: 'derived',
          kind: 'category',
          element: mergedCategory(
            block as CategoryBlock,
            hidden,
            overrides,
            block.id ? overrides[block.id] : undefined,
          ),
        });
      } else if (type === 'item' || type === 'divider' || type === 'clock' || type === 'date') {
        slots.push({
          source: 'derived',
          kind: type as BarEntryKind,
          element: merged(block, block.id ? overrides[block.id] : undefined),
        });
      }
    }
    // An explicit mobile.footer replaces the derived button strip outright.
    const menu: BarEntry[] =
      footer !== null
        ? []
        : (config.footer?.buttons ?? [])
            .filter((btn) => !(btn.id && hidden.has(btn.id)))
            .map((btn) => ({
              source: 'derived' as const,
              kind: 'button' as const,
              element: merged(btn, btn.id ? overrides[btn.id] : undefined),
            }));
    return { slots, menu, extras, footer: footer ?? [] };
  }

  const byId = new Map<
    string,
    { kind: BarEntryKind; element: ItemBlock | CategoryBlock | FooterButtonConfig | SidebarBlock }
  >();
  for (const block of blocks) {
    const type = block.type ?? 'item';
    const usable =
      type === 'item' ||
      type === 'category' ||
      type === 'divider' ||
      type === 'clock' ||
      type === 'date';
    if (block.id && usable) {
      byId.set(block.id, { kind: type as BarEntryKind, element: block });
    }
    if (type === 'category') {
      for (const child of (block as CategoryBlock).items ?? []) {
        if (child.id) {
          byId.set(child.id, { kind: 'item', element: child });
        }
      }
    }
  }
  for (const btn of config.footer?.buttons ?? []) {
    if (btn.id) {
      byId.set(btn.id, { kind: 'button', element: btn });
    }
  }

  const slots: BarEntry[] = [];
  for (const entry of mobile.items) {
    if ('use' in entry) {
      const target = byId.get(entry.use);
      if (!target) {
        continue; // validation reports this; resolution just skips it
      }
      const patch = patchOf(entry);
      slots.push({
        source: 'use',
        kind: target.kind,
        element:
          target.kind === 'category'
            ? mergedCategory(target.element as CategoryBlock, new Set(), {}, patch)
            : merged(target.element, patch),
      });
    } else {
      slots.push({ source: 'inline', kind: 'item', element: { ...entry } });
    }
  }
  return { slots, menu: [], extras, footer: footer ?? [] };
};
