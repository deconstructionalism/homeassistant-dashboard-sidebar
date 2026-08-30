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
    expect(slots[2].querySelector('.dashboard-sidebar-bar-caret')).to.exist;
    expect(slots[0].id).to.equal('rooms');
    expect(slots[3].classList.contains('dashboard-sidebar-bar-slot-overflow')).to.equal(true);
    expect(
      root(el).querySelector('.dashboard-sidebar-bar')?.getAttribute('data-overflowing'),
    ).to.equal('true');
  });

  it('opens the dots menu with the footer button and runs from it', async () => {
    const el = await mount({ ...base(), mobile: {} });
    const dots = root(el).querySelector(
      '.dashboard-sidebar-bar-slot-overflow',
    ) as HTMLButtonElement;
    dots.click();
    await el.updateComplete;
    const rows = root(el).querySelectorAll('.dashboard-sidebar-bar-flyout-row');
    expect(rows.length).to.equal(1);
    expect(rows[0].querySelector('ha-icon')?.getAttribute('icon')).to.equal('mdi:lock');
    dots.click();
    await el.updateComplete;
    expect(root(el).querySelector('.dashboard-sidebar-bar-flyout')).to.equal(null);
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

  it('renders clock and divider slots when derived', async () => {
    const config = base();
    config.header = [
      { type: 'clock', id: 'clk', format: '%H:%M' },
      { type: 'divider', id: 'div1' },
    ];
    const el = await mount({ ...config, mobile: {} });
    expect(
      root(el).querySelector('.dashboard-sidebar-bar-slot-clock .dashboard-sidebar-bar-time')
        ?.textContent,
    ).to.match(/\d{2}:\d{2}/);
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

  it('applies the labels mode as a data attribute for styling hooks', async () => {
    const el = await mount({ ...base(), mobile: { labels: 'active' } });
    expect(root(el).querySelector('.dashboard-sidebar-bar')?.getAttribute('data-labels')).to.equal(
      'active',
    );
  });
});
