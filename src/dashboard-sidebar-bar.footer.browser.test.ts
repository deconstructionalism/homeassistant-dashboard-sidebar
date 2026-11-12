import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig, FooterConfig } from './lib/types';
import './dashboard-sidebar-bar';

// The mobile bar sheet's footer row settings (#3): align and the class / id
// hooks, in a custom bar (its own footer) and a mirrored one (the desktop's).
// Where the buttons actually land is measured.

const TAP = { action: 'toggle' } as const;

const twoButtons = (extra: Partial<FooterConfig> = {}): FooterConfig => ({
  buttons: [
    { icon: 'mdi:home', tap_action: TAP },
    { icon: 'mdi:cog', tap_action: TAP },
  ],
  ...extra,
});

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebarBar> => {
  const el = await fixture<DashboardSidebarBar>(
    html`<dashboard-sidebar-bar style="width: 400px"></dashboard-sidebar-bar>`,
  );
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

/** Opens the sheet through the overflow (dots) slot. */
const openSheet = async (el: DashboardSidebarBar): Promise<void> => {
  const dots = el.shadowRoot?.querySelector('.dashboard-sidebar-bar-slot-overflow') as HTMLElement;
  expect(dots, 'overflow slot').to.exist;
  dots.click();
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
};

const sheetFooter = (el: DashboardSidebarBar): HTMLElement =>
  el.shadowRoot?.querySelector('.dashboard-sidebar-bar-sheet-footer') as HTMLElement;

/** The sheet footer buttons' gaps to the row's left and right inner edges. */
const edges = (el: DashboardSidebarBar): { left: number; right: number } => {
  const row = sheetFooter(el);
  expect(row, 'sheet footer row').to.exist;
  const box = row.getBoundingClientRect();
  const cs = getComputedStyle(row);
  const innerLeft = box.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const innerRight = box.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
  const btns = [...row.querySelectorAll<HTMLElement>('.dashboard-sidebar-bar-sheet-footer-btn')];
  expect(btns.length, 'two buttons').to.equal(2);
  return {
    left: btns[0].getBoundingClientRect().left - innerLeft,
    right: innerRight - btns[1].getBoundingClientRect().right,
  };
};

const custom = (footer: FooterConfig, labels = false): DashboardSidebarConfig => ({
  body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
  mobile: {
    mode: 'custom',
    labels,
    items: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
    footer,
  },
});

describe('<dashboard-sidebar-bar> sheet footer row settings', () => {
  for (const labels of [false, true]) {
    describe(labels ? 'with labels' : 'without labels', () => {
      it('starts the buttons at the left by default', async () => {
        const el = await mount(custom(twoButtons(), labels));
        await openSheet(el);
        const e = edges(el);
        expect(e.left).to.be.closeTo(0, 1);
        expect(e.right).to.be.greaterThan(40);
      });

      it('ends them at the right with align: right', async () => {
        const el = await mount(custom(twoButtons({ align: 'right' }), labels));
        await openSheet(el);
        const e = edges(el);
        expect(e.right).to.be.closeTo(0, 1);
        expect(e.left).to.be.greaterThan(40);
      });

      it('centers them with align: center', async () => {
        const el = await mount(custom(twoButtons({ align: 'center' }), labels));
        await openSheet(el);
        const e = edges(el);
        expect(e.left).to.be.greaterThan(20);
        expect(Math.abs(e.left - e.right)).to.be.lessThan(2);
      });
    });
  }

  it('aligns a mirrored bar by the desktop footer', async () => {
    const el = await mount({
      body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
      footer: twoButtons({ align: 'right' }),
      mobile: { mode: 'mirror' },
    });
    await openSheet(el);
    expect(edges(el).right).to.be.closeTo(0, 1);
  });

  it('puts the class and id hooks on the sheet footer row', async () => {
    const el = await mount(custom(twoButtons({ class: 'bar-foot', id: 'bf1' })));
    await openSheet(el);
    const row = sheetFooter(el);
    expect(row.classList.contains('bar-foot')).to.equal(true);
    expect(row.id).to.equal('bf1');
    expect(row.getAttribute('data-style-loc')).to.equal('footer');
  });
});
