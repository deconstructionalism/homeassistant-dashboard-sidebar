import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardSidebarConfig, FooterConfig } from './lib/types';
import './dashboard-sidebar';

// The footer row's own settings (#3): align, and the class / id hooks. Where
// the buttons actually land is measured, so this checks what you'd see.

const TAP = { action: 'toggle' } as const;

/** A footer with two buttons, leaving room in the row to align them. */
const footer = (extra: Partial<FooterConfig> = {}): FooterConfig => ({
  buttons: [
    { icon: 'mdi:home', tap_action: TAP },
    { icon: 'mdi:cog', tap_action: TAP },
  ],
  ...extra,
});

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebar> => {
  const el = await fixture<DashboardSidebar>(
    html`<div style="height: 600px; display: flex">
      <dashboard-sidebar style="width: 240px"></dashboard-sidebar>
    </div>`,
  ).then((wrap) => wrap.querySelector('dashboard-sidebar') as DashboardSidebar);
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

const footerEl = (el: DashboardSidebar): HTMLElement =>
  el.shadowRoot?.querySelector('.dashboard-sidebar-footer') as HTMLElement;

/** The footer buttons' left/right edges relative to the footer row's content box. */
const edges = (el: DashboardSidebar): { left: number; right: number } => {
  const row = footerEl(el);
  const box = row.getBoundingClientRect();
  const cs = getComputedStyle(row);
  const innerLeft = box.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const innerRight = box.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
  const btns = [...row.querySelectorAll<HTMLElement>('.dashboard-sidebar-footer-btn')];
  expect(btns.length, 'two buttons').to.equal(2);
  const first = btns[0].getBoundingClientRect();
  const last = btns[btns.length - 1].getBoundingClientRect();
  return { left: first.left - innerLeft, right: innerRight - last.right };
};

describe('<dashboard-sidebar> footer row settings', () => {
  beforeEach(() => window.localStorage.clear());

  const body = [{ type: 'item' as const, title: 'A', tap_action: TAP }];

  it('starts the buttons at the left by default', async () => {
    const el = await mount({ body, footer: footer() });
    const e = edges(el);
    expect(e.left).to.be.closeTo(0, 1);
    expect(e.right).to.be.greaterThan(40);
  });

  it('ends them at the right with align: right', async () => {
    const el = await mount({ body, footer: footer({ align: 'right' }) });
    const e = edges(el);
    expect(e.right).to.be.closeTo(0, 1);
    expect(e.left).to.be.greaterThan(40);
  });

  it('centers them with align: center', async () => {
    const el = await mount({ body, footer: footer({ align: 'center' }) });
    const e = edges(el);
    expect(e.left).to.be.greaterThan(20);
    expect(Math.abs(e.left - e.right)).to.be.lessThan(2);
  });

  it('still centers the footer while collapsed, whatever the align', async () => {
    const el = await mount({ body, start_collapsed: true, footer: footer({ align: 'right' }) });
    expect(footerEl(el).style.justifyContent, 'no inline align while collapsed').to.equal('');
  });

  it('puts the class and id hooks on the footer row', async () => {
    const el = await mount({ body, footer: footer({ class: 'my-footer extra', id: 'f1' }) });
    const row = footerEl(el);
    expect(row.classList.contains('my-footer')).to.equal(true);
    expect(row.classList.contains('extra')).to.equal(true);
    expect(row.id).to.equal('f1');
    expect(row.getAttribute('data-style-loc')).to.equal('footer');
  });

  it('marks a card footer row too, so its styles and hooks apply', async () => {
    (window as unknown as { loadCardHelpers?: () => Promise<unknown> }).loadCardHelpers =
      async () => ({ createCardElement: () => document.createElement('div') });
    const el = await mount({
      body,
      footer: { card: { type: 'markdown', content: 'x' }, class: 'card-foot' },
    });
    const row = footerEl(el);
    expect(row, 'card footer row').to.exist;
    expect(row.classList.contains('card-foot')).to.equal(true);
    expect(row.getAttribute('data-style-loc')).to.equal('footer');
    delete (window as unknown as { loadCardHelpers?: unknown }).loadCardHelpers;
  });
});
