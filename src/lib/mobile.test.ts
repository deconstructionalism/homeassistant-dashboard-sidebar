import { describe, expect, it } from 'vitest';

import { resolveBar } from './mobile';
import type { DashboardSidebarConfig, ItemBlock } from './types';

const TAP = { action: 'toggle' } as const;

/** A desktop config: clock, two items, a category with two children, footer. */
const base = (): DashboardSidebarConfig => ({
  header: [{ type: 'clock', id: 'clk' }],
  body: [
    { type: 'item', id: 'rooms', title: 'Rooms', icon: 'mdi:home', tap_action: TAP },
    { type: 'item', id: 'weather', title: 'Weather', tap_action: TAP },
    {
      type: 'category',
      id: 'garden',
      title: 'Garden',
      items: [
        { id: 'plants', title: 'Plants', tap_action: TAP },
        { id: 'soil', title: 'Soil', tap_action: TAP },
      ],
    },
    { type: 'markdown', id: 'md', content: 'x' },
  ],
  footer: { buttons: [{ id: 'lock', icon: 'mdi:lock', tap_action: TAP }] },
});

describe('resolveBar, derive mode', () => {
  it('returns nothing without a mobile config', () => {
    expect(resolveBar(base())).toEqual({ slots: [], menu: [] });
  });

  it('mirrors the nav in order, footer buttons to the menu, non-bar blocks skipped', () => {
    const config = { ...base(), mobile: {} };
    const { slots, menu } = resolveBar(config);
    expect(slots.map((e) => e.kind)).toEqual(['clock', 'item', 'item', 'category']);
    expect(slots.map((e) => (e.element as ItemBlock).id)).toEqual([
      'clk',
      'rooms',
      'weather',
      'garden',
    ]);
    expect(slots.every((e) => e.source === 'derived')).toBe(true);
    expect(menu.map((e) => (e.element as ItemBlock).id)).toEqual(['lock']);
    expect(menu[0].kind).toBe('button');
  });

  it('applies hide to slots, category children, and menu buttons', () => {
    const config = { ...base(), mobile: { hide: ['weather', 'soil', 'lock', 'clk'] } };
    const { slots, menu } = resolveBar(config);
    expect(slots.map((e) => (e.element as ItemBlock).id)).toEqual(['rooms', 'garden']);
    const garden = slots[1].element as { items: { id?: string }[] };
    expect(garden.items.map((c) => c.id)).toEqual(['plants']);
    expect(menu).toEqual([]);
  });

  it('applies overrides to elements and children without mutating the config', () => {
    const config = {
      ...base(),
      mobile: {
        override: {
          rooms: { icon: 'mdi:home-variant' },
          plants: { title: 'Green' },
        },
      },
    };
    const { slots: bar } = resolveBar(config);
    expect((bar[1].element as ItemBlock).icon).toBe('mdi:home-variant');
    const garden = bar[3].element as { items: { title?: string }[] };
    expect(garden.items[0].title).toBe('Green');
    expect((config.body?.[0] as ItemBlock).icon).toBe('mdi:home');
    expect((config.body?.[2] as { items: { title?: string }[] }).items[0].title).toBe('Plants');
  });
});

describe('resolveBar, explicit mode', () => {
  it('maps use references, inline patches, and inline items', () => {
    const config = {
      ...base(),
      mobile: {
        items: [
          { use: 'weather', icon: 'mdi:weather-cloudy' },
          { use: 'lock' },
          { use: 'plants' },
          { type: 'item', id: 'extra', title: 'Extra', tap_action: TAP } as ItemBlock,
        ],
      },
    };
    const { slots: bar, menu } = resolveBar(config);
    expect(menu).toEqual([]);
    expect(bar.map((e) => e.source)).toEqual(['use', 'use', 'use', 'inline']);
    expect(bar.map((e) => e.kind)).toEqual(['item', 'button', 'item', 'item']);
    expect((bar[0].element as ItemBlock).icon).toBe('mdi:weather-cloudy');
    expect((bar[0].element as ItemBlock).title).toBe('Weather');
  });

  it('permits repeated use of the same id', () => {
    const config = { ...base(), mobile: { items: [{ use: 'rooms' }, { use: 'rooms' }] } };
    expect(resolveBar(config).slots).toHaveLength(2);
  });

  it('resolves a category by id with its children intact', () => {
    const config = { ...base(), mobile: { items: [{ use: 'garden', title: 'Yard' }] } };
    const bar = resolveBar(config).slots;
    expect(bar[0].kind).toBe('category');
    const garden = bar[0].element as { title?: string; items: unknown[] };
    expect(garden.title).toBe('Yard');
    expect(garden.items).toHaveLength(2);
  });

  it('skips unresolvable references instead of throwing', () => {
    const config = { ...base(), mobile: { items: [{ use: 'nope' }, { use: 'rooms' }] } };
    expect(resolveBar(config).slots).toHaveLength(1);
  });
});
