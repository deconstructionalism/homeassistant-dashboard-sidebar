import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig } from './lib/types';
import './dashboard-sidebar';
import './dashboard-sidebar-bar';

// Its own page: no styling engine at first render, then UIX registers. UIX
// and card-mod are frontend modules that often load after the sidebar's first
// render. The whole-sidebar style always retried; per-element styles used to
// be marked applied before anything applied them, so they never appeared.

const TAP = { action: 'toggle' } as const;

/** A stand-in for UIX's `uix-node`, recording applyToElement calls. */
class LateUix extends HTMLElement {
  /** Recorded calls, inspected by the tests. */
  static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];

  /** Records the arguments. */
  static applyToElement(element: HTMLElement, type: string, config: unknown): void {
    LateUix.calls.push({ element, type, config });
  }
}

/** Lets the engine's whenDefined callbacks and the re-render they request run. */
const flush = async (...els: Array<{ updateComplete: Promise<unknown> }>): Promise<void> => {
  await aTimeout(0);
  for (const el of els) {
    await el.updateComplete;
  }
  await aTimeout(0);
};

describe('styles set before UIX loads', () => {
  let sidebar: DashboardSidebar;
  let bar: DashboardSidebarBar;

  const config: DashboardSidebarConfig = {
    uix: { style: ':host { color: red; }' },
    header: [
      { type: 'title', text: 'One', uix: { style: '.dashboard-sidebar-title { color: red; }' } },
    ],
    body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
    footer: {
      buttons: [
        { icon: 'mdi:cog', tap_action: TAP, card_mod: { style: ':scope { color: red; }' } },
      ],
    },
    mobile: { mode: 'mirror', uix: { style: ':host { color: blue; }' } },
  };

  before(async () => {
    sidebar = await fixture<DashboardSidebar>(html`<dashboard-sidebar></dashboard-sidebar>`);
    sidebar.setConfig(config);
    bar = await fixture<DashboardSidebarBar>(html`<dashboard-sidebar-bar></dashboard-sidebar-bar>`);
    bar.setConfig(config);
    await flush(sidebar, bar);
  });

  it('applies nothing while no engine is installed', () => {
    expect(customElements.get('uix-node')).to.equal(undefined);
    expect(LateUix.calls).to.have.length(0);
  });

  it('applies the whole-sidebar, per-element and bar styles once UIX arrives', async () => {
    customElements.define('uix-node', LateUix);
    await flush(sidebar, bar);
    const types = LateUix.calls.map((c) => c.type);
    expect(types, 'whole sidebar').to.include('dashboard-sidebar');
    expect(types, 'a header element').to.include('dashboard-sidebar:header:0');
    expect(types, 'a footer button, by its card_mod').to.include('dashboard-sidebar:footer:btn:0');
    expect(types, 'the mobile bar').to.include('dashboard-sidebar-bar');
    const el = LateUix.calls.find((c) => c.type === 'dashboard-sidebar:header:0')!.element;
    expect(el.getAttribute('data-loc')).to.equal('header:0');
  });

  it('applies each of them only once after that', async () => {
    const count = (type: string) => LateUix.calls.filter((c) => c.type === type).length;
    (sidebar as unknown as { requestUpdate: () => void }).requestUpdate();
    await flush(sidebar);
    expect(count('dashboard-sidebar')).to.equal(1);
    expect(count('dashboard-sidebar:header:0')).to.equal(1);
    expect(count('dashboard-sidebar:footer:btn:0')).to.equal(1);
  });
});
