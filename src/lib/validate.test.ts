import { describe, expect, it } from 'vitest';

import type { DashboardSidebarConfig } from './types';
import { validateConfig } from './validate';

/**
 * A minimal valid single-sidebar config the cases mutate into invalid shapes.
 */
const valid = (): DashboardSidebarConfig => ({
  body: [{ type: 'item', title: 'Home', tap_action: { action: 'toggle' } }],
});

/**
 * Stamps sequential ids onto any element missing one, so fixtures can stay
 * focused on what each test is about. Id presence itself is covered by the
 * dedicated tests at the bottom.
 */
const withIds = (config: DashboardSidebarConfig): DashboardSidebarConfig => {
  if (!config || typeof config !== 'object') {
    return config;
  }
  let n = 0;
  const stamp = (el: unknown): void => {
    if (el && typeof el === 'object' && !(el as { id?: string }).id) {
      (el as { id: string }).id = `t${(n += 1)}`;
    }
  };
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  for (const block of [...list(config.header), ...list(config.body)]) {
    stamp(block);
    for (const child of list((block as { items?: unknown[] }).items)) {
      stamp(child);
    }
  }
  for (const btn of list(config.footer?.buttons)) {
    stamp(btn);
  }
  return config;
};

/** validateConfig over an id-stamped copy of the fixture. */
const vc = (config: DashboardSidebarConfig): string[] => {
  return validateConfig(withIds(config));
};

describe('validateConfig', () => {
  it('accepts a minimal valid config', () => {
    expect(vc(valid())).toHaveLength(0);
  });

  it('requires a header or body', () => {
    expect(vc({})).toContain('dashboard_sidebar: needs a header or body with at least one block');
  });

  it('rejects a non-mapping config', () => {
    expect(vc(null as unknown as DashboardSidebarConfig)).toEqual([
      'dashboard_sidebar: config must be a mapping',
    ]);
  });

  it('checks the position enum', () => {
    expect(vc({ ...valid(), position: 'up' } as unknown as DashboardSidebarConfig)).toContain(
      'position: must be "left" or "right"',
    );
  });

  it('flags unknown keys and non-list regions', () => {
    expect(vc({ ...valid(), bogus: 1 } as DashboardSidebarConfig)).toContain(
      'dashboard_sidebar: unknown option "bogus"',
    );
    expect(vc({ body: 'nope' } as unknown as DashboardSidebarConfig)).toContain(
      'body: must be a list',
    );
  });

  it('checks the overlay flag is a boolean', () => {
    expect(vc({ ...valid(), overlay: 'yes' } as unknown as DashboardSidebarConfig)).toContain(
      'overlay: must be true or false',
    );
    expect(vc({ ...valid(), overlay: true })).toHaveLength(0);
  });

  it('checks numeric types', () => {
    expect(vc({ ...valid(), width: '240' } as unknown as DashboardSidebarConfig)).toContain(
      'width: must be a number',
    );
  });

  it('requires a valid block type and flags unknown block keys', () => {
    expect(vc({ body: [{ text: 'x' }] } as unknown as DashboardSidebarConfig)).toContain(
      'body[0]: needs a valid type (title, clock, date, divider, item, category, markdown, card)',
    );
    expect(
      vc({
        header: [{ type: 'title', text: 'x', foo: 1 }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('header[0]: unknown option "foo"');
  });

  it('accepts color options across block types and the footer', () => {
    expect(
      vc({
        header: [
          { type: 'title', text: 'x', text_color: 'red' },
          { type: 'clock', text_color: '{{ states("sensor.c") }}' },
          { type: 'date', text_color: 'blue' },
          { type: 'divider', color: '#333' },
        ],
        body: [
          {
            type: 'category',
            title: 'c',
            text_color: 'green',
            icon_color: 'amber',
            items: [{ title: 'i', tap_action: { action: 'toggle' } }],
          },
          { type: 'markdown', content: 'x', text_color: 'teal' },
        ],
        footer: { markdown: 'x', markdown_color: 'coral' },
      } as unknown as DashboardSidebarConfig),
    ).toHaveLength(0);
  });

  it('accepts card_mod on the sidebar and on individual elements', () => {
    expect(
      vc({
        card_mod: { style: ':host { color: red; }' },
        body: [
          {
            type: 'item',
            title: 'i',
            tap_action: { action: 'toggle' },
            card_mod: { style: '.x { color: blue; }' },
          },
        ],
        footer: {
          buttons: [
            { icon: 'mdi:cog', tap_action: { action: 'toggle' }, card_mod: { style: 'x' } },
          ],
        },
      } as unknown as DashboardSidebarConfig),
    ).toHaveLength(0);
  });

  it('rejects a non-mapping card_mod', () => {
    expect(vc({ ...valid(), card_mod: 'nope' } as unknown as DashboardSidebarConfig)).toContain(
      'card_mod: must be a mapping',
    );
    expect(
      vc({
        body: [{ type: 'item', title: 'i', tap_action: { action: 'toggle' }, card_mod: ['x'] }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('body[0].card_mod: must be a mapping');
  });

  it('validates title, clock, and date blocks', () => {
    expect(vc({ header: [{ type: 'title' }] } as unknown as DashboardSidebarConfig)).toContain(
      'header[0]: title needs text',
    );
    expect(
      vc({
        header: [{ type: 'title', text: 'x', align: 'middle' }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('header[0].align: must be left, center, or right');
    expect(
      vc({
        header: [{ type: 'clock', collapsed_format: '48h' }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('header[0].collapsed_format: must be "12h" or "24h"');
    // Cross-type tokens are allowed now (they render literally), not an error.
    expect(
      vc({
        header: [{ type: 'clock', format: '%Y' }],
      } as DashboardSidebarConfig),
    ).toHaveLength(0);
  });

  it('validates items and category nesting', () => {
    expect(
      vc({
        body: [{ type: 'item', tap_action: { action: 'toggle' } }],
      } as DashboardSidebarConfig),
    ).toContain('body[0]: needs a title');
    expect(vc({ body: [{ type: 'item', title: 'A' }] } as DashboardSidebarConfig)).toContain(
      'body[0]: needs a tap_action',
    );
    expect(
      vc({
        body: [{ type: 'category', title: 'C', items: [] }],
      } as DashboardSidebarConfig),
    ).toContain('body[0]: category needs a non-empty items list');
    const nested = {
      body: [
        { type: 'category', title: 'C', items: [{ type: 'category', title: 'S', items: [] }] },
      ],
    } as unknown as DashboardSidebarConfig;
    expect(vc(nested)).toContain('body[0].items[0]: a category can only contain items');
  });

  it('validates markdown and card blocks', () => {
    expect(vc({ body: [{ type: 'card' }] } as unknown as DashboardSidebarConfig)).toContain(
      'body[0]: card needs a card config',
    );
    expect(vc({ body: [{ type: 'markdown' }] } as unknown as DashboardSidebarConfig)).toContain(
      'body[0]: markdown needs content',
    );
  });

  it('validates the footer', () => {
    expect(
      vc({
        ...valid(),
        footer: {
          buttons: [{ icon: 'mdi:cog', tap_action: { action: 'toggle' } }],
          markdown: 'x',
        },
      } as DashboardSidebarConfig),
    ).toContain('footer: set only one of buttons, card, or markdown');
    expect(
      vc({ ...valid(), footer: { buttons: {} } } as unknown as DashboardSidebarConfig),
    ).toContain('footer.buttons: must be a list');
    expect(
      vc({
        ...valid(),
        footer: { buttons: [{ tap_action: { action: 'toggle' } }] },
      } as DashboardSidebarConfig),
    ).toContain('footer.buttons[0]: needs an icon');
  });
});

/** A tap action reused across the merged fixtures. */
const TAP = { action: 'toggle' } as const;

// --- merged from abbr.test.ts ---
describe('validateConfig — abbr', () => {
  it('accepts an abbr on an icon-less item', () => {
    expect(
      vc({
        body: [{ type: 'item', title: 'Loft Room', abbr: 'Lo', tap_action: TAP }],
      }),
    ).toHaveLength(0);
  });

  it('rejects a non-string abbr', () => {
    expect(
      vc({
        body: [{ type: 'item', title: 'A', abbr: 5, tap_action: TAP }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('body[0].abbr: must be a string');
  });

  it('rejects abbr together with an icon on an item', () => {
    expect(
      vc({
        body: [{ type: 'item', title: 'A', icon: 'mdi:home', abbr: 'A', tap_action: TAP }],
      }),
    ).toContain('body[0]: abbr is only allowed when icon is not set');
  });

  it('applies the same rules to categories', () => {
    expect(
      vc({
        body: [
          { type: 'category', title: 'Utah', abbr: 'Ut', items: [{ title: 'x', tap_action: TAP }] },
        ],
      }),
    ).toHaveLength(0);
    expect(
      vc({
        body: [
          {
            type: 'category',
            title: 'Utah',
            icon: 'mdi:map',
            abbr: 'Ut',
            items: [{ title: 'x', tap_action: TAP }],
          },
        ],
      }),
    ).toContain('body[0]: abbr is only allowed when icon is not set');
  });
});

// --- merged from config-species.test.ts ---
describe('validateConfig — every block and option together', () => {
  it('accepts a config exercising every block type and option', () => {
    const config: DashboardSidebarConfig = {
      width: 300,
      start_collapsed: false,
      hide_on_mobile: true,
      overlay: true,
      background: '#111',
      header: [
        {
          type: 'title',
          text: '{{ states("sun.sun") }}',
          align: 'left',
          tap_action: { action: 'navigate', navigation_path: '/' },
        },
        {
          type: 'clock',
          format: '%-I:%M:%S %p',
          timezone: 'America/New_York',
          align: 'left',
          tap_action: { action: 'more-info', entity: 'sun.sun' },
          hold_action: { action: 'navigate', navigation_path: '/config' },
          double_tap_action: { action: 'toggle' },
        },
        { type: 'date', format: '%Y-%m-%d', align: 'left', tap_action: { action: 'none' } },
        { type: 'divider' },
        { type: 'markdown', content: '**hi**', align: 'center' },
        {
          type: 'card',
          card: { type: 'entities', entities: ['light.a'] },
          align: 'center',
          background: 'rgba(0,0,0,0.1)',
        },
      ],
      body: [
        {
          type: 'item',
          title: 'Home',
          icon: 'mdi:home',
          tap_action: { action: 'navigate', navigation_path: '/' },
        },
        { type: 'divider' },
        {
          type: 'category',
          title: 'Rooms',
          icon: 'mdi:floor-plan',
          start_collapsed: true,
          guide_line: false,
          items: [{ title: 'Kitchen', entity: 'light.k', tap_action: { action: 'toggle' } }],
        },
        { type: 'card', card: { type: 'entities', entities: ['light.k'] } },
      ],
      footer: {
        divider: false,
        buttons: [
          {
            icon: 'mdi:cog',
            title: 'Settings',
            tap_action: { action: 'navigate', navigation_path: '/config' },
          },
        ],
      },
      card_mod: { style: '.x {}' },
    };
    expect(vc(config)).toHaveLength(0);
  });

  it('accepts a footer card in place of buttons', () => {
    const config: DashboardSidebarConfig = {
      body: [{ type: 'item', title: 'A', tap_action: { action: 'toggle' } }],
      footer: { card: { type: 'gauge', entity: 'sensor.x' } },
    };
    expect(vc(config)).toHaveLength(0);
  });
});

// --- merged from hooks.test.ts ---
describe('validateConfig — class/id hooks', () => {
  it('accepts class and id on blocks and footer buttons', () => {
    const config: DashboardSidebarConfig = {
      header: [{ type: 'title', text: 'Home', class: 'my-title', id: 'title-1' }],
      body: [{ type: 'item', title: 'A', class: 'a b', id: 'home', tap_action: TAP }],
      footer: { buttons: [{ icon: 'mdi:cog', class: 'cog', id: 'cog', tap_action: TAP }] },
    };
    expect(vc(config)).toHaveLength(0);
  });

  it('rejects a non-string class or id', () => {
    expect(
      vc({
        body: [{ type: 'item', title: 'A', class: 5, tap_action: TAP }],
      } as unknown as DashboardSidebarConfig),
    ).toContain('body[0].class: must be a string');
    expect(
      vc({ header: [{ type: 'divider', id: 5 }] } as unknown as DashboardSidebarConfig),
    ).toContain('header[0].id: must be a string');
  });
});

describe('element ids', () => {
  it('requires an id on every element', () => {
    const errors = validateConfig({
      body: [{ type: 'item', title: 'Home', tap_action: { action: 'toggle' } }],
    } as DashboardSidebarConfig);
    expect(errors.some((e) => e.includes('needs a unique id'))).toBe(true);
  });

  it('rejects duplicate ids across regions and the footer', () => {
    const errors = validateConfig({
      header: [{ type: 'clock', id: 'dupe' }],
      body: [{ type: 'item', id: 'dupe', title: 'A', tap_action: { action: 'toggle' } }],
      footer: { buttons: [{ icon: 'mdi:cog', id: 'dupe', tap_action: { action: 'toggle' } }] },
    } as DashboardSidebarConfig);
    expect(errors.filter((e) => e.includes('already used'))).toHaveLength(2);
  });

  it('accepts unique ids everywhere', () => {
    const errors = vc({
      body: [
        { type: 'item', id: 'a', title: 'A', tap_action: { action: 'toggle' } },
        { type: 'item', id: 'b', title: 'B', tap_action: { action: 'toggle' } },
      ],
    } as DashboardSidebarConfig);
    expect(errors).toHaveLength(0);
  });
});

describe('mobile config', () => {
  const withMobile = (mobile: unknown): DashboardSidebarConfig =>
    ({
      body: [
        { type: 'item', id: 'rooms', title: 'Rooms', tap_action: { action: 'toggle' } },
        {
          type: 'category',
          id: 'garden',
          title: 'Garden',
          items: [{ id: 'plants', title: 'Plants', tap_action: { action: 'toggle' } }],
        },
        { type: 'markdown', id: 'md', content: 'x' },
      ],
      footer: {
        buttons: [{ id: 'lock', icon: 'mdi:lock', tap_action: { action: 'toggle' } }],
      },
      mobile,
    }) as DashboardSidebarConfig;

  it('accepts an empty mobile config (pure derive)', () => {
    expect(validateConfig(withMobile({}))).toHaveLength(0);
  });

  it('accepts derive-mode hide and override of items, children, and buttons', () => {
    const errors = validateConfig(
      withMobile({
        hide: ['plants'],
        override: { rooms: { icon: 'mdi:home' }, lock: { title: 'Door' } },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects items combined with hide or override', () => {
    const errors = validateConfig(withMobile({ items: [{ use: 'rooms' }], hide: ['lock'] }));
    expect(errors.some((e) => e.includes('defines the whole bar'))).toBe(true);
  });

  it('rejects mobile together with hide_on_mobile', () => {
    const config = withMobile({});
    (config as { hide_on_mobile?: boolean }).hide_on_mobile = true;
    expect(validateConfig(config).some((e) => e.includes('hide_on_mobile'))).toBe(true);
  });

  it('rejects unknown and bar-ineligible references with guidance', () => {
    const errors = validateConfig(withMobile({ hide: ['nope', 'md'] }));
    expect(errors.some((e) => e.includes('unknown id "nope"'))).toBe(true);
    expect(errors.some((e) => e.includes('not bar-eligible'))).toBe(true);
  });

  it('rejects hiding and overriding the same id', () => {
    const errors = validateConfig(
      withMobile({ hide: ['rooms'], override: { rooms: { title: 'X' } } }),
    );
    expect(errors.some((e) => e.includes('both hidden and overridden'))).toBe(true);
  });

  it('rejects patching identity properties', () => {
    const errors = validateConfig(
      withMobile({ override: { rooms: { id: 'other', type: 'card' } } }),
    );
    expect(errors.filter((e) => e.includes('not an overridable property'))).toHaveLength(2);
  });

  it('validates use entries and inline items in explicit mode', () => {
    const good = validateConfig(
      withMobile({
        items: [
          { use: 'garden', title: 'Yard' },
          { use: 'rooms' },
          { use: 'rooms' },
          { type: 'item', id: 'extra', title: 'Extra', tap_action: { action: 'toggle' } },
        ],
      }),
    );
    expect(good).toHaveLength(0);
    const bad = validateConfig(
      withMobile({ items: [{ type: 'item', title: 'NoId', tap_action: { action: 'toggle' } }] }),
    );
    expect(bad.some((e) => e.includes('needs a unique id'))).toBe(true);
  });

  it('inline mobile ids join the global uniqueness check', () => {
    const errors = validateConfig(
      withMobile({
        items: [{ type: 'item', id: 'rooms', title: 'Dup', tap_action: { action: 'toggle' } }],
      }),
    );
    expect(errors.some((e) => e.includes('already used'))).toBe(true);
  });

  it('checks the bar options', () => {
    const errors = validateConfig(
      withMobile({
        breakpoint: -1,
        labels: 'sometimes',
        background: 5,
        extra: true,
      }),
    );
    expect(errors.some((e) => e.includes('breakpoint'))).toBe(true);
    expect(errors.some((e) => e.includes('labels'))).toBe(true);
    expect(errors.some((e) => e.includes('background'))).toBe(true);
    expect(errors.some((e) => e.includes('extra'))).toBe(true);
  });
});
