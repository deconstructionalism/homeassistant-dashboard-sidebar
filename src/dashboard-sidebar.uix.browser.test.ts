import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig } from './lib/types';
import './dashboard-sidebar';
import './dashboard-sidebar-bar';

// The sidebar and mobile bar styled end to end with only UIX installed (no
// card-mod), which is what UIX's migration steps leave you with. The stub
// really renders: it injects the config's CSS where the real engines do
// (inside the element's shadow root, or the element itself when it has
// none), so these assert what you would see, not just what was called.

const TAP = { action: 'toggle' } as const;
const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

/** A stand-in for UIX's `uix-node` that records each call and renders its CSS. */
class RenderingUix extends HTMLElement {
  /** Recorded calls, inspected by the tests. */
  static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];
  /** When set, the next call for an element (not the sidebar) throws once. */
  static failNextElement = false;

  /** Records the call and injects `config.style` into the element. */
  static applyToElement(element: HTMLElement, type: string, config: unknown): void {
    if (RenderingUix.failNextElement && type.startsWith('dashboard-sidebar:')) {
      RenderingUix.failNextElement = false;
      throw new Error('not ready yet');
    }
    RenderingUix.calls.push({ element, type, config });
    const css = (config as { style?: unknown })?.style;
    if (typeof css !== 'string') {
      return;
    }
    const target = element.shadowRoot ?? element;
    let style = target.querySelector<HTMLStyleElement>(`style[data-uix="${type}"]`);
    if (!style) {
      style = document.createElement('style');
      style.dataset.uix = type;
      target.appendChild(style);
    }
    style.textContent = css;
  }
}

/** Mounts the sidebar with a config and waits for its first render. */
const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebar> => {
  const el = await fixture<DashboardSidebar>(html`<dashboard-sidebar></dashboard-sidebar>`);
  el.setConfig(config);
  await el.updateComplete;
  await aTimeout(0);
  await el.updateComplete;
  return el;
};

/** Mounts the mobile bar with a config and waits for its first render. */
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

/** Two titles and an item, the shape most of the tests style. */
const titles = (extra: Partial<DashboardSidebarConfig> = {}): DashboardSidebarConfig => ({
  header: [
    { type: 'title', text: 'One' },
    { type: 'title', text: 'Two' },
  ],
  body: [{ type: 'item', title: 'A', tap_action: TAP }],
  ...extra,
});

describe('<dashboard-sidebar> with UIX installed (no card-mod)', () => {
  before(() => {
    customElements.define('uix-node', RenderingUix);
  });

  beforeEach(() => {
    RenderingUix.calls = [];
    window.localStorage.clear();
  });

  it('renders the whole-sidebar uix styles', async () => {
    const uix = { style: `.dashboard-sidebar-title { color: ${RED}; }` };
    const el = await mount(titles({ uix }));
    const call = RenderingUix.calls.find((c) => c.type === 'dashboard-sidebar');
    expect(call?.element).to.equal(el);
    expect(call?.config).to.deep.equal(uix);
    expect(colorAt(el, 'header:0')).to.equal(RED);
    expect(colorAt(el, 'header:1')).to.equal(RED);
  });

  it('renders a legacy card_mod config through UIX', async () => {
    const card_mod = { style: `.dashboard-sidebar-title { color: ${BLUE}; }` };
    const el = await mount(titles({ card_mod }));
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
  });

  it('uses uix over card_mod at the sidebar level when both are set', async () => {
    const el = await mount(
      titles({
        uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        card_mod: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
      }),
    );
    const sidebarCalls = RenderingUix.calls.filter((c) => c.type === 'dashboard-sidebar');
    expect(sidebarCalls).to.have.length(1);
    expect(colorAt(el, 'header:0')).to.equal(RED);
  });

  it('scopes a per-element uix to that element only', async () => {
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
    const call = RenderingUix.calls.find((c) => c.type === 'dashboard-sidebar:header:0');
    expect(call, 'element-level UIX call').to.exist;
    expect((call!.element as HTMLElement).getAttribute('data-loc')).to.equal('header:0');
    expect((call!.config as { style: string }).style).to.contain(
      '[data-loc="header:0"]:is(.dashboard-sidebar-title)',
    );
    expect(colorAt(el, 'header:0')).to.equal(RED);
    expect(colorAt(el, 'header:1')).to.not.equal(RED);
  });

  it('uses uix over card_mod on the same element', async () => {
    const el = await mount({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
          card_mod: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
        },
      ],
    });
    expect(colorAt(el, 'header:0')).to.equal(RED);
  });

  it('styles a category child item and a footer button by their own uix', async () => {
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
            card_mod: { style: `.dashboard-sidebar-footer-btn { color: ${BLUE}; }` },
          },
        ],
      },
    });
    const types = RenderingUix.calls.map((c) => c.type);
    expect(types).to.include('dashboard-sidebar:body:0.0');
    expect(types).to.include('dashboard-sidebar:footer:btn:0');
    expect(colorAt(el, 'body:0.0')).to.equal(RED);
    expect(colorAt(el, 'footer:btn:0')).to.equal(BLUE);
  });

  it('applies each style once across re-renders', async () => {
    const el = await mount(
      titles({
        uix: { style: ':host { color: red; }' },
        header: [
          {
            type: 'title',
            text: 'One',
            uix: { style: '.dashboard-sidebar-title { color: red; }' },
          },
        ],
      }),
    );
    const before = RenderingUix.calls.length;
    const rerender = el as unknown as { requestUpdate: () => void };
    rerender.requestUpdate();
    await el.updateComplete;
    rerender.requestUpdate();
    await el.updateComplete;
    expect(RenderingUix.calls.length).to.equal(before);
  });

  it('re-applies an element whose uix changes', async () => {
    const el = await mount({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        },
      ],
    });
    expect(colorAt(el, 'header:0')).to.equal(RED);
    el.setConfig({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
        },
      ],
    });
    await el.updateComplete;
    await aTimeout(0);
    await el.updateComplete;
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
  });

  it('retries an element whose styling failed, on the next render', async () => {
    RenderingUix.failNextElement = true;
    const el = await mount({
      header: [
        {
          type: 'title',
          text: 'One',
          uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
        },
      ],
    });
    expect(colorAt(el, 'header:0'), 'not styled while the engine failed').to.not.equal(RED);
    // Any later render (in Home Assistant, the next state change) retries it.
    (el as unknown as { requestUpdate: () => void }).requestUpdate();
    await el.updateComplete;
    expect(colorAt(el, 'header:0')).to.equal(RED);
  });

  it('does not style an invalid uix value (it must be a mapping)', async () => {
    await mount(titles({ uix: 'color: red' as unknown as Record<string, unknown> }));
    expect(RenderingUix.calls).to.have.length(0);
  });
});

describe('<dashboard-sidebar-bar> with UIX installed (no card-mod)', () => {
  beforeEach(() => {
    RenderingUix.calls = [];
  });

  const barBase = (extra: Partial<DashboardSidebarConfig>): DashboardSidebarConfig => ({
    body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
    ...extra,
  });

  /** The bar's own (bar-level) style calls. */
  const barCalls = () => RenderingUix.calls.filter((c) => c.type === 'dashboard-sidebar-bar');

  it('renders mobile.uix on the bar', async () => {
    const uix = { style: `:host { color: ${RED}; }` };
    const el = await mountBar(barBase({ mobile: { mode: 'mirror', uix } }));
    expect(barCalls()[0]?.element).to.equal(el);
    expect(barCalls()[0]?.config).to.deep.equal(uix);
    expect(getComputedStyle(el).color).to.equal(RED);
  });

  it('falls back to the desktop uix while mirroring', async () => {
    const uix = { style: `:host { color: ${BLUE}; }` };
    const el = await mountBar(barBase({ uix, mobile: { mode: 'mirror' } }));
    expect(barCalls()[0]?.config).to.deep.equal(uix);
    expect(getComputedStyle(el).color).to.equal(BLUE);
  });

  it('uses mobile.uix over the desktop uix, and over its own card_mod', async () => {
    const el = await mountBar(
      barBase({
        uix: { style: `:host { color: ${BLUE}; }` },
        mobile: {
          mode: 'mirror',
          uix: { style: `:host { color: ${RED}; }` },
          card_mod: { style: ':host { color: rgb(0, 128, 0); }' },
        },
      }),
    );
    expect(getComputedStyle(el).color).to.equal(RED);
  });

  it('renders a legacy mobile.card_mod through UIX', async () => {
    const el = await mountBar(
      barBase({ mobile: { mode: 'mirror', card_mod: { style: `:host { color: ${BLUE}; }` } } }),
    );
    expect(getComputedStyle(el).color).to.equal(BLUE);
  });
});
