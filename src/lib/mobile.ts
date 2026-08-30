/**
 * Mobile bar resolution.
 *
 * Turns a validated config into the effective ordered bar: derive mode
 * mirrors the desktop nav (items and categories, in document order) minus
 * `hide` and with `override` patches applied; explicit mode maps the
 * `items` list, resolving `use:` references and passing inline items
 * through. Pure logic, no rendering.
 */

import type {
  CategoryBlock,
  DashboardSidebarConfig,
  FooterButtonConfig,
  ItemBlock,
  MobileOverride,
  MobileUseEntry,
} from './types';

/** What kind of desktop element a bar entry renders as. */
export type BarEntryKind = 'item' | 'category' | 'button';

/** Where a bar entry came from. */
export type BarEntrySource = 'derived' | 'use' | 'inline';

/** One resolved slot of the mobile bar. */
export interface BarEntry {
  /** How the entry reached the bar. */
  source: BarEntrySource;
  /** What it renders as. */
  kind: BarEntryKind;
  /** The element with any mobile patches applied. Categories keep their items. */
  element: ItemBlock | CategoryBlock | FooterButtonConfig;
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
export const resolveBar = (config: DashboardSidebarConfig): BarEntry[] => {
  const mobile = config.mobile;
  if (!mobile) {
    return [];
  }
  const hidden = new Set(mobile.hide ?? []);
  const overrides = mobile.override ?? {};
  const blocks = [...(config.header ?? []), ...(config.body ?? [])];

  if (mobile.items === undefined) {
    const bar: BarEntry[] = [];
    for (const block of blocks) {
      const type = block.type ?? 'item';
      if (block.id && hidden.has(block.id)) {
        continue;
      }
      if (type === 'item') {
        bar.push({
          source: 'derived',
          kind: 'item',
          element: merged(block as ItemBlock, block.id ? overrides[block.id] : undefined),
        });
      } else if (type === 'category') {
        bar.push({
          source: 'derived',
          kind: 'category',
          element: mergedCategory(
            block as CategoryBlock,
            hidden,
            overrides,
            block.id ? overrides[block.id] : undefined,
          ),
        });
      }
    }
    return bar;
  }

  const byId = new Map<
    string,
    { kind: BarEntryKind; element: ItemBlock | CategoryBlock | FooterButtonConfig }
  >();
  for (const block of blocks) {
    const type = block.type ?? 'item';
    if (block.id && (type === 'item' || type === 'category')) {
      byId.set(block.id, { kind: type, element: block as ItemBlock | CategoryBlock });
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

  const bar: BarEntry[] = [];
  for (const entry of mobile.items) {
    if ('use' in entry) {
      const target = byId.get(entry.use);
      if (!target) {
        continue; // validation reports this; resolution just skips it
      }
      const patch = patchOf(entry);
      bar.push({
        source: 'use',
        kind: target.kind,
        element:
          target.kind === 'category'
            ? mergedCategory(target.element as CategoryBlock, new Set(), {}, patch)
            : merged(target.element, patch),
      });
    } else {
      bar.push({ source: 'inline', kind: 'item', element: { ...entry } });
    }
  }
  return bar;
};
