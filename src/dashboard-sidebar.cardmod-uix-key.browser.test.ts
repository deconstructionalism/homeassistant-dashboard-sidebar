import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig } from './lib/types';
import './dashboard-sidebar';
import './dashboard-sidebar-bar';

// Only card-mod installed, with styles under the `uix:` key. The editor saves
// every style under `uix:`, so this is where a card-mod user ends up after
// editing one: card-mod must render `uix:` configs just like `card_mod:` ones.
// The stub really renders (it injects the config's CSS where card-mod does),
// so these assert computed styles, not just calls.

const TAP = { action: 'toggle' } as const;
const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

/** A stand-in for card-mod that records each call and renders its CSS. */
class RenderingCardMod extends HTMLElement {
  /** Recorded calls, inspected by the tests. */
  static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];

  /** Records the call and injects `config.style` into the element. */
  static applyToElement(element: HTMLElement, type: string, config: unknown): void {
    RenderingCardMod.calls.push({ element, type, config });
    const css = (config as { style?: unknown })?.style;
    if (typeof css !== 'string') {
      return;
    }
    const target = element.shadowRoot ?? element;
    let style = target.querySelector<HTMLStyleElement>(`style[data-card-mod="${type}"]`);
    if (!style) {
      style = document.createElement('style');
      style.dataset.cardMod = type;
      target.appendChild(style);
    }
    style.textContent = css;
  }
}

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebar> => {
  const el = await fixture<DashboardSidebar>(html`<dashboard-sidebar></dashboard-sidebar>`);
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

const mountBar = async (config: DashboardSidebarConfig): Promise<DashboardSidebarBar> => {
  const el = await fixture<DashboardSidebarBar>(
    html`<dashboard-sidebar-bar></dashboard-sidebar-bar>`,
  );
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

/** The computed color of the element at `loc` in the sidebar's shadow root. */
const colorAt = (el: DashboardSidebar, loc: string): string => {
  const node = el.shadowRoot?.querySelector(`[data-loc="${loc}"]`) as HTMLElement;
  expect(node, `element ${loc}`).to.exist;
  return getComputedStyle(node).color;
};

describe('<dashboard-sidebar> with only card-mod installed, styled under uix:', () => {
  before(() => {
    customElements.define('card-mod', RenderingCardMod);
  });

  beforeEach(() => {
    RenderingCardMod.calls = [];
    window.localStorage.clear();
  });

  it('renders the whole-sidebar uix through card-mod', async () => {
    const uix = { style: `.dashboard-sidebar-title { color: ${RED}; }` };
    const el = await mount({
      uix,
      header: [
        { type: 'title', text: 'One' },
        { type: 'title', text: 'Two' },
      ],
    });
    const call = RenderingCardMod.calls.find((c) => c.type === 'dashboard-sidebar');
    expect(call?.element).to.equal(el);
    expect(call?.config).to.deep.equal(uix);
    expect(colorAt(el, 'header:0')).to.equal(RED);
    expect(colorAt(el, 'header:1')).to.equal(RED);
  });

  it('renders a per-element uix through card-mod, scoped to that element', async () => {
    const el = await mount({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        },
        { type: 'title', text: 'Two' },
      ],
    });
    expect(RenderingCardMod.calls.map((c) => c.type)).to.include('dashboard-sidebar:header:0');
    expect(colorAt(el, 'header:0')).to.equal(RED);
    expect(colorAt(el, 'header:1')).to.not.equal(RED);
  });

  it('renders a category item and a footer button uix through card-mod', async () => {
    const el = await mount({
      body: [
        {
          type: 'category',
          title: 'Rooms',
          start_collapsed: false,
          items: [
            {
              title: 'Kitchen',
              tap_action: TAP,
              uix: { style: `.dashboard-sidebar-item { color: ${RED}; }` },
            },
          ],
        },
      ],
      footer: {
        buttons: [
          {
            icon: 'mdi:cog',
            tap_action: TAP,
            uix: { style: `.dashboard-sidebar-footer-btn { color: ${BLUE}; }` },
          },
        ],
      },
    });
    expect(colorAt(el, 'body:0.0')).to.equal(RED);
    expect(colorAt(el, 'footer:btn:0')).to.equal(BLUE);
  });

  it('uses uix over card_mod with card-mod as the engine too', async () => {
    const el = await mount({
      uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
      card_mod: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
          card_mod: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        },
        { type: 'title', text: 'Two' },
      ],
    });
    // The element's uix (blue) beats its card_mod (red) and the sidebar's red.
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
    // The sidebar's uix (red) beats its card_mod (blue).
    expect(colorAt(el, 'header:1')).to.equal(RED);
  });

  it('still renders a mix: uix on one element, card_mod on another', async () => {
    const el = await mount({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        },
        {
          type: 'title',
          text: 'Two',
          card_mod: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
        },
      ],
    });
    expect(colorAt(el, 'header:0')).to.equal(RED);
    expect(colorAt(el, 'header:1')).to.equal(BLUE);
  });
});

describe('<dashboard-sidebar-bar> with only card-mod installed, styled under uix:', () => {
  beforeEach(() => {
    RenderingCardMod.calls = [];
  });

  const barBase = (extra: Partial<DashboardSidebarConfig>): DashboardSidebarConfig => ({
    body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
    ...extra,
  });

  it('renders mobile.uix on the bar through card-mod', async () => {
    const el = await mountBar(
      barBase({ mobile: { mode: 'mirror', uix: { style: `:host { color: ${RED}; }` } } }),
    );
    const call = RenderingCardMod.calls.find((c) => c.type === 'dashboard-sidebar-bar');
    expect(call?.element).to.equal(el);
    expect(getComputedStyle(el).color).to.equal(RED);
  });

  it('falls back to the desktop uix while mirroring, through card-mod', async () => {
    const el = await mountBar(
      barBase({ uix: { style: `:host { color: ${BLUE}; }` }, mobile: { mode: 'mirror' } }),
    );
    expect(getComputedStyle(el).color).to.equal(BLUE);
  });
});
