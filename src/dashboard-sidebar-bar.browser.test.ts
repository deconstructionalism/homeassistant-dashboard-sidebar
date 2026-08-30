import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import './dashboard-sidebar-bar';
import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig } from './lib/types';

const TAP = { action: 'toggle' } as const;

/** A desktop config with nav items, a category, a non-nav block, a button. */
const base = (): DashboardSidebarConfig => ({
  body: [
    {
      type: 'item',
      id: 'rooms',
      title: 'Rooms',
      icon: 'mdi:home',
      tap_action: { action: 'navigate', navigation_path: '/lovelace/rooms' },
    },
    { type: 'item', id: 'weather', title: 'Weather', tap_action: TAP },
    {
      type: 'category',
      id: 'garden',
      title: 'Garden',
      icon: 'mdi:flower',
      items: [{ id: 'plants', title: 'Plants', tap_action: TAP }],
    },
    { type: 'markdown', id: 'md', content: 'x' },
  ],
  footer: { buttons: [{ id: 'lock', icon: 'mdi:lock', tap_action: TAP }] },
});

/** Mounts the bar with a config. */
const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebarBar> => {
  const el = await fixture<DashboardSidebarBar>(
    html`<dashboard-sidebar-bar></dashboard-sidebar-bar>`,
  );
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

/** The bar's shadow root. */
const root = (el: DashboardSidebarBar): ShadowRoot => {
  const r = el.shadowRoot;
  expect(r, 'shadow root').to.exist;
  return r as ShadowRoot;
};

describe('<dashboard-sidebar-bar>', () => {
  it('renders nothing without a mobile config', async () => {
    const el = await mount(base());
    expect(root(el).querySelector('.dashboard-sidebar-bar')).to.equal(null);
  });

  it('derives nav items and categories into classed slots, buttons behind dots', async () => {
    const el = await mount({ ...base(), mobile: {} });
    const slots = root(el).querySelectorAll('.dashboard-sidebar-bar-slot');
    expect(slots.length).to.equal(4);
    expect(slots[0].classList.contains('dashboard-sidebar-bar-slot-item')).to.equal(true);
    expect(slots[2].classList.contains('dashboard-sidebar-bar-slot-category')).to.equal(true);
    expect(slots[2].querySelector('.dashboard-sidebar-bar-caret')).to.equal(null);
    expect(slots[0].id).to.equal('rooms');
    expect(slots[3].classList.contains('dashboard-sidebar-bar-slot-overflow')).to.equal(true);
    expect(
      root(el).querySelector('.dashboard-sidebar-bar')?.getAttribute('data-overflowing'),
    ).to.equal('true');
  });

  it('opens the dots sheet with the footer button pinned across its bottom', async () => {
    const el = await mount({ ...base(), mobile: {} });
    const dots = root(el).querySelector(
      '.dashboard-sidebar-bar-slot-overflow',
    ) as HTMLButtonElement;
    dots.click();
    await el.updateComplete;
    expect(root(el).querySelector('.dashboard-sidebar-bar-sheet')).to.exist;
    expect(root(el).querySelector('.dashboard-sidebar-bar-sheet-scrim')).to.exist;
    const btns = root(el).querySelectorAll('.dashboard-sidebar-bar-sheet-footer-btn');
    expect(btns.length).to.equal(1);
    expect(btns[0].querySelector('ha-icon')?.getAttribute('icon')).to.equal('mdi:lock');
    dots.click();
    await el.updateComplete;
    expect(root(el).querySelector('.dashboard-sidebar-bar-sheet')).to.equal(null);
  });

  it('shows the dots for a markdown footer and hosts it in the sheet', async () => {
    (window as unknown as { loadCardHelpers?: () => Promise<unknown> }).loadCardHelpers =
      async () => ({
        createCardElement: () => {
          const div = document.createElement('div');
          div.className = 'stub-card';
          return div;
        },
      });
    try {
      const config = base();
      config.footer = { markdown: 'hello' };
      const el = await mount({ ...config, mobile: {} });
      const dots = root(el).querySelector(
        '.dashboard-sidebar-bar-slot-overflow',
      ) as HTMLButtonElement;
      expect(dots).to.exist;
      dots.click();
      await el.updateComplete;
      await aTimeout(0);
      await el.updateComplete;
      const content = root(el).querySelector('.dashboard-sidebar-bar-sheet-footer-content');
      expect(content?.querySelector('.stub-card')).to.exist;
      expect(root(el).querySelectorAll('.dashboard-sidebar-bar-sheet-footer-btn').length).to.equal(
        0,
      );
    } finally {
      delete (window as unknown as { loadCardHelpers?: unknown }).loadCardHelpers;
    }
  });

  it('shows curated menu entries: titles, markdown cards, and rows', async () => {
    (window as unknown as { loadCardHelpers?: () => Promise<unknown> }).loadCardHelpers =
      async () => ({
        createCardElement: () => {
          const div = document.createElement('div');
          div.className = 'stub-card';
          return div;
        },
      });
    try {
      const config = base();
      const el = await mount({
        ...config,
        mobile: {
          menu: [{ type: 'title', id: 't1', text: 'Section' }, { use: 'md' }, { use: 'weather' }],
        },
      });
      const dots = root(el).querySelector(
        '.dashboard-sidebar-bar-slot-overflow',
      ) as HTMLButtonElement;
      expect(dots).to.exist;
      dots.click();
      await el.updateComplete;
      await aTimeout(0);
      await el.updateComplete;
      const title = root(el).querySelector('.dashboard-sidebar-bar-sheet-title');
      expect(title?.textContent?.trim()).to.equal('Section');
      expect(root(el).querySelector('.dashboard-sidebar-bar-sheet-card .stub-card')).to.exist;
      const rows = root(el).querySelectorAll('.dashboard-sidebar-bar-sheet-row');
      expect([...rows].some((r) => r.textContent?.includes('Weather'))).to.equal(true);
    } finally {
      delete (window as unknown as { loadCardHelpers?: unknown }).loadCardHelpers;
    }
  });

  it('folds overflow into the sheet with accordion categories', async () => {
    const config = base();
    config.body = [
      ...Array.from({ length: 25 }, (_, i) => ({
        type: 'item' as const,
        id: `it${i}`,
        title: `Item ${i}`,
        icon: 'mdi:circle',
        tap_action: TAP,
      })),
      {
        type: 'category',
        id: 'garden',
        title: 'Garden',
        icon: 'mdi:flower',
        items: [{ id: 'plants', title: 'Plants', tap_action: TAP }],
      },
    ];
    const el = await mount({ ...config, mobile: {} });
    const dots = root(el).querySelector(
      '.dashboard-sidebar-bar-slot-overflow',
    ) as HTMLButtonElement;
    expect(dots).to.exist;
    dots.click();
    await el.updateComplete;
    const cat = root(el).querySelector(
      '.dashboard-sidebar-bar-sheet-category',
    ) as HTMLButtonElement;
    expect(cat).to.exist;
    expect(root(el).querySelector('.dashboard-sidebar-bar-sheet-children')).to.equal(null);
    cat.click();
    await el.updateComplete;
    const children = root(el).querySelector('.dashboard-sidebar-bar-sheet-children');
    expect(children?.textContent).to.include('Plants');
  });

  it('opens a category flyout above its slot', async () => {
    const el = await mount({ ...base(), mobile: {} });
    const cat = root(el).querySelector('.dashboard-sidebar-bar-slot-category') as HTMLButtonElement;
    cat.click();
    await el.updateComplete;
    const rows = root(el).querySelectorAll('.dashboard-sidebar-bar-flyout-row');
    expect(rows.length).to.equal(1);
    expect(rows[0].textContent).to.include('Plants');
  });

  it('renders dividers as rules and clocks/dates in compact form', async () => {
    const config = base();
    config.header = [
      { type: 'clock', id: 'clk' },
      { type: 'date', id: 'dt' },
      { type: 'divider', id: 'div1' },
    ];
    const el = await mount({ ...config, mobile: {} });
    const clock = root(el).querySelector('.dashboard-sidebar-bar-slot-clock');
    const date = root(el).querySelector('.dashboard-sidebar-bar-slot-date');
    expect(clock?.textContent?.trim()).to.match(/^\d{1,2}:\d{2}$/);
    expect(date?.textContent?.trim()).to.match(/^\d{1,2}-\d{1,2}$/);
    expect(root(el).querySelector('.dashboard-sidebar-bar-divider')).to.exist;
  });

  it('exposes targetable chrome classes', async () => {
    const el = await mount({ ...base(), mobile: {} });
    const r = root(el);
    expect(r.querySelector('nav.dashboard-sidebar-bar')).to.exist;
    expect(r.querySelector('.dashboard-sidebar-bar-slots')).to.exist;
    expect(r.querySelector('.dashboard-sidebar-bar-icon')).to.exist;
  });

  it('honors hide and override in derive mode', async () => {
    const el = await mount({
      ...base(),
      mobile: { hide: ['weather', 'lock'], override: { rooms: { icon: 'mdi:home-variant' } } },
    });
    const slots = root(el).querySelectorAll('.dashboard-sidebar-bar-slot');
    expect(slots.length).to.equal(2);
    const icon = slots[0].querySelector('ha-icon');
    expect(icon?.getAttribute('icon')).to.equal('mdi:home-variant');
  });

  it('renders an explicit bar including a footer button reuse', async () => {
    const el = await mount({
      ...base(),
      mobile: { items: [{ use: 'lock' }, { use: 'rooms', title: 'Casa' }] },
    });
    const slots = root(el).querySelectorAll('.dashboard-sidebar-bar-slot');
    expect(slots.length).to.equal(2);
    expect(slots[0].classList.contains('dashboard-sidebar-bar-slot-button')).to.equal(true);
    expect(slots[1].getAttribute('aria-label')).to.equal('Casa');
  });

  it('labels always shows titles; never hides them', async () => {
    const labeled = await mount({ ...base(), mobile: { labels: 'always', hide: ['lock'] } });
    expect(root(labeled).querySelectorAll('.dashboard-sidebar-bar-label').length).to.equal(3);
    const bare = await mount({ ...base(), mobile: {} });
    expect(root(bare).querySelectorAll('.dashboard-sidebar-bar-label').length).to.equal(0);
  });

  it('marks the slot matching the current page active', async () => {
    history.replaceState(null, '', '/lovelace/rooms');
    const el = await mount({ ...base(), mobile: {} });
    const active = root(el).querySelectorAll('.dashboard-sidebar-bar-slot-active');
    expect(active.length).to.equal(1);
    expect(active[0].id).to.equal('rooms');
    history.replaceState(null, '', '/');
  });

  it('reflects the dock position on the host, defaulting to bottom', async () => {
    const bottom = await mount({ ...base(), mobile: {} });
    expect(bottom.getAttribute('data-position')).to.equal('bottom');
    const top = await mount({ ...base(), mobile: { position: 'top' } });
    expect(top.getAttribute('data-position')).to.equal('top');
  });

  it('applies the labels mode as a data attribute for styling hooks', async () => {
    const el = await mount({ ...base(), mobile: { labels: 'active' } });
    expect(root(el).querySelector('.dashboard-sidebar-bar')?.getAttribute('data-labels')).to.equal(
      'active',
    );
  });
});
