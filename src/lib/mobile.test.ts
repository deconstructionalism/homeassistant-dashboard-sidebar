import { describe, expect, it } from 'vitest';

import { resolveBar } from './mobile';
import type { DashboardSidebarConfig, ItemBlock } from './types';

const TAP = { action: 'toggle' } as const;

/** A desktop config: clock, two items, a category with two children, footer. */
const base = (): DashboardSidebarConfig => ({
  header: [{ type: 'clock' }],
  body: [
    { type: 'item', title: 'Rooms', icon: 'mdi:home', tap_action: TAP },
    { type: 'item', title: 'Weather', tap_action: TAP },
    {
      type: 'category',
      title: 'Garden',
      items: [
        { title: 'Plants', tap_action: TAP },
        { title: 'Soil', tap_action: TAP },
      ],
    },
    { type: 'markdown', content: 'x' },
  ],
  footer: { buttons: [{ icon: 'mdi:lock', tap_action: TAP }] },
});

/** The title (or icon, for buttons) of each resolved entry, for assertions. */
const labels = (entries: { element: unknown }[]): (string | undefined)[] =>
  entries.map((e) => {
    const el = e.element as { title?: string; icon?: string };
    return el.title ?? el.icon;
  });

describe('resolveBar, mirror mode', () => {
  it('returns nothing without a mobile config', () => {
    expect(resolveBar(base())).toEqual({ slots: [], menu: [], extras: [], footer: [] });
  });

  it('mirrors the nav in order, footer buttons to the menu, non-bar blocks skipped', () => {
    const config = { ...base(), mobile: {} };
    const { slots, menu } = resolveBar(config);
    expect(slots.map((e) => e.kind)).toEqual(['clock', 'item', 'item', 'category']);
    expect(labels(slots)).toEqual([undefined, 'Rooms', 'Weather', 'Garden']);
    expect(slots.every((e) => e.source === 'derived')).toBe(true);
    expect(labels(menu)).toEqual(['mdi:lock']);
    expect(menu[0].kind).toBe('button');
  });

  it('keeps category children intact', () => {
    const { slots } = resolveBar({ ...base(), mobile: {} });
    const garden = slots[3].element as { items: { title?: string }[] };
    expect(garden.items.map((c) => c.title)).toEqual(['Plants', 'Soil']);
  });

  it('copies elements instead of sharing them with the config', () => {
    const config = { ...base(), mobile: {} };
    const { slots } = resolveBar(config);
    expect(slots[1].element).not.toBe(config.body?.[0]);
    (slots[1].element as ItemBlock).icon = 'mdi:home-variant';
    expect((config.body?.[0] as ItemBlock).icon).toBe('mdi:home');
    const garden = slots[3].element as { items: { title?: string }[] };
    garden.items[0].title = 'Green';
    expect((config.body?.[2] as { items: { title?: string }[] }).items[0].title).toBe('Plants');
  });

  it('carries clocks and dates onto the bar and skips cards and markdown', () => {
    const config = base();
    config.header = [{ type: 'clock' }, { type: 'date' }];
    const { slots } = resolveBar({ ...config, mobile: {} });
    expect(slots.slice(0, 2).map((e) => e.kind)).toEqual(['clock', 'date']);
    expect(slots.some((e) => e.kind === 'markdown')).toBe(false);
  });
});

describe('resolveBar, viewport modes', () => {
  it('derives the bar from on_mobile: bar alone, as if mobile were empty', () => {
    const config = { ...base(), on_mobile: 'bar' as const };
    const { slots, menu } = resolveBar(config);
    expect(slots.map((e) => e.kind)).toEqual(['clock', 'item', 'item', 'category']);
    expect(menu).toHaveLength(1);
  });

  it('hiding the desktop alone keeps the mobile sidebar, not the bar', () => {
    const config = { ...base(), on_desktop: 'hidden' as const };
    expect(resolveBar(config).slots).toEqual([]);
  });
});

describe('resolveBar, sheet menu', () => {
  it('resolves inline blocks of any kind, by their type', () => {
    const config = {
      ...base(),
      mobile: {
        items: [{ type: 'item', title: 'Only', tap_action: TAP }],
        menu: [
          { type: 'markdown', content: 'x' },
          { type: 'category', title: 'Yard', items: [{ title: 'Plants', tap_action: TAP }] },
          { type: 'title', text: 'Hello' },
          { title: 'Bare', tap_action: TAP },
        ],
      },
    } as DashboardSidebarConfig;
    const { extras } = resolveBar(config);
    expect(extras.map((e) => e.kind)).toEqual(['markdown', 'category', 'title', 'item']);
    expect((extras[1].element as { title?: string }).title).toBe('Yard');
    expect(extras.every((e) => e.source === 'inline')).toBe(true);
  });

  it('composes with custom mode', () => {
    const config = {
      ...base(),
      mobile: {
        items: [{ type: 'item', title: 'Rooms', tap_action: TAP }],
        menu: [{ type: 'markdown', content: 'x' }],
      },
    } as DashboardSidebarConfig;
    const { slots, extras } = resolveBar(config);
    expect(slots).toHaveLength(1);
    expect(extras.map((e) => e.kind)).toEqual(['markdown']);
  });
});

describe('resolveBar, sheet footer strip', () => {
  it('builds the strip from the custom footer buttons', () => {
    const config = {
      ...base(),
      mobile: {
        items: [{ type: 'item', title: 'Only', tap_action: TAP }],
        footer: {
          buttons: [
            { icon: 'mdi:home', tap_action: TAP },
            { icon: 'mdi:lock-open', tap_action: TAP },
          ],
        },
      },
    } as DashboardSidebarConfig;
    const { menu, footer } = resolveBar(config);
    expect(menu).toEqual([]);
    expect(footer.map((e) => e.kind)).toEqual(['button', 'button']);
    expect(footer.every((e) => e.source === 'inline')).toBe(true);
    expect((footer[1].element as { icon?: string }).icon).toBe('mdi:lock-open');
  });

  it('fills the strip in custom mode', () => {
    const config = {
      ...base(),
      mobile: {
        items: [{ type: 'item', title: 'Rooms', tap_action: TAP }],
        footer: { buttons: [{ icon: 'mdi:lock', tap_action: TAP }] },
      },
    } as DashboardSidebarConfig;
    const { footer } = resolveBar(config);
    expect(footer.map((e) => e.kind)).toEqual(['button']);
  });

  it('a custom bar inherits no footer strip when it declares none', () => {
    const config = {
      ...base(),
      mobile: { items: [{ type: 'item', title: 'Only', tap_action: TAP }] },
    } as DashboardSidebarConfig;
    const { menu, footer } = resolveBar(config);
    expect(menu).toEqual([]);
    expect(footer).toEqual([]);
  });

  it('a mirrored bar ignores curated menu and footer entirely', () => {
    // Validation rejects these keys without `items`; the resolver must not
    // read them either, so a stale config cannot leak content into a mirror.
    const config = {
      ...base(),
      mobile: {
        menu: [{ type: 'title', text: 'Nope' }],
        footer: { buttons: [{ icon: 'mdi:ghost', tap_action: TAP }] },
      },
    } as unknown as DashboardSidebarConfig;
    const { extras, footer, menu } = resolveBar(config);
    expect(extras).toEqual([]);
    expect(footer).toEqual([]);
    // The desktop footer button still rides behind the dots.
    expect(menu.map((e) => e.kind)).toEqual(['button']);
  });
});

describe('resolveBar, custom mode', () => {
  it('renders inline non-item kinds by their type', () => {
    const config = {
      ...base(),
      mobile: {
        items: [
          { type: 'divider' },
          { type: 'clock' },
          { type: 'item', title: 'New', tap_action: TAP },
        ],
      },
    } as DashboardSidebarConfig;
    expect(resolveBar(config).slots.map((e) => e.kind)).toEqual(['divider', 'clock', 'item']);
  });

  it('the items list is the whole bar, with no derived menu', () => {
    const config = {
      ...base(),
      mobile: {
        items: [
          { title: 'Weather', icon: 'mdi:weather-cloudy', tap_action: TAP },
          { type: 'item', title: 'Extra', tap_action: TAP } as ItemBlock,
        ],
      },
    } as DashboardSidebarConfig;
    const { slots, menu } = resolveBar(config);
    expect(menu).toEqual([]);
    expect(slots.map((e) => e.source)).toEqual(['inline', 'inline']);
    expect(slots.map((e) => e.kind)).toEqual(['item', 'item']);
    expect((slots[0].element as ItemBlock).icon).toBe('mdi:weather-cloudy');
    expect((slots[0].element as ItemBlock).title).toBe('Weather');
  });

  it('an empty items list yields an empty bar rather than mirroring', () => {
    const config = { ...base(), mobile: { items: [] } } as DashboardSidebarConfig;
    const { slots, menu } = resolveBar(config);
    expect(slots).toEqual([]);
    expect(menu).toEqual([]);
  });

  it('carries an inline category with its children intact', () => {
    const config = {
      ...base(),
      mobile: {
        items: [
          {
            type: 'category',
            title: 'Yard',
            items: [
              { title: 'Plants', tap_action: TAP },
              { title: 'Soil', tap_action: TAP },
            ],
          },
        ],
      },
    } as unknown as DashboardSidebarConfig;
    const bar = resolveBar(config).slots;
    expect(bar[0].kind).toBe('category');
    const garden = bar[0].element as { title?: string; items: unknown[] };
    expect(garden.title).toBe('Yard');
    expect(garden.items).toHaveLength(2);
  });
});
