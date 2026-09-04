/**
 * Mobile bar resolution.
 *
 * Turns a validated config into the effective ordered bar: mirror mode
 * mirrors the desktop nav (items, categories, clocks, dates, and dividers,
 * in document order); custom mode maps the `items` list, which is the whole
 * bar. Pure logic, no rendering.
 */

import type {
  CategoryBlock,
  DashboardSidebarConfig,
  FooterButtonConfig,
  ItemBlock,
  SidebarBlock,
} from './types';

/** What renders on wide (desktop) viewports. */
export const desktopMode = (config: DashboardSidebarConfig): 'sidebar' | 'hidden' => {
  return config.on_desktop ?? 'sidebar';
};

/**
 * What renders on narrow (mobile) viewports. Explicit `on_mobile` wins; a
 * present `mobile` section implies the bar; the default is the sidebar.
 */
export const mobileMode = (config: DashboardSidebarConfig): 'sidebar' | 'bar' | 'hidden' => {
  return config.on_mobile ?? (config.mobile ? 'bar' : 'sidebar');
};

/** What kind of desktop element a bar entry renders as. */
export type BarEntryKind =
  'item' | 'category' | 'button' | 'divider' | 'clock' | 'date' | 'title' | 'markdown' | 'card';

/** Where a bar entry came from. */
export type BarEntrySource = 'derived' | 'inline';

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
  /** The element. Categories keep their items. */
  element: ItemBlock | CategoryBlock | FooterButtonConfig | SidebarBlock;
}

/** Resolves one curated list (`mobile.menu` / `mobile.footer`) to entries. */
const resolveCurated = (entries: unknown, inlineKind?: BarEntryKind): BarEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }
  return (entries as SidebarBlock[]).map((entry) => ({
    source: 'inline' as const,
    kind: inlineKind ?? ((entry.type ?? 'item') as BarEntryKind),
    element: { ...entry },
  }));
};

/**
 * Resolves the effective mobile bar for a config.
 *
 * @param config - A validated sidebar config with a `mobile` section.
 * @returns The ordered bar entries; empty when there is no mobile config.
 */
export const resolveBar = (config: DashboardSidebarConfig): ResolvedBar => {
  // `on_mobile: bar` without a mobile section mirrors with all defaults.
  const mobile = mobileMode(config) === 'bar' ? (config.mobile ?? {}) : undefined;
  if (!mobile) {
    return { slots: [], menu: [], extras: [], footer: [] };
  }
  const extras = resolveCurated(mobile.menu);
  const footer = mobile.footer !== undefined ? resolveCurated(mobile.footer, 'button') : null;

  if (mobile.items === undefined) {
    // Mirror mode: the desktop nav, in document order.
    const slots: BarEntry[] = [];
    for (const block of [...(config.header ?? []), ...(config.body ?? [])]) {
      const type = block.type ?? 'item';
      if (type === 'category') {
        const category = block as CategoryBlock;
        slots.push({
          source: 'derived',
          kind: 'category',
          element: {
            ...category,
            items: (category.items ?? []).map((child) => ({ ...child })),
          },
        });
      } else if (type === 'item' || type === 'divider' || type === 'clock' || type === 'date') {
        slots.push({ source: 'derived', kind: type as BarEntryKind, element: { ...block } });
      }
    }
    // An explicit mobile.footer replaces the derived button strip outright.
    const menu: BarEntry[] =
      footer !== null
        ? []
        : (config.footer?.buttons ?? []).map((btn) => ({
            source: 'derived' as const,
            kind: 'button' as const,
            element: { ...btn },
          }));
    return { slots, menu, extras, footer: footer ?? [] };
  }

  // Custom mode: the items list is the whole bar.
  const slots: BarEntry[] = mobile.items.map((entry) => ({
    source: 'inline' as const,
    kind: ((entry as SidebarBlock).type ?? 'item') as BarEntryKind,
    element: { ...entry },
  }));
  return { slots, menu: [], extras, footer: footer ?? [] };
};
