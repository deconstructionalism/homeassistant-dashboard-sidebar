import { aTimeout, expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardSidebarBar } from './dashboard-sidebar-bar';
import type { DashboardSidebarConfig } from './lib/types';
import './dashboard-sidebar';
import './dashboard-sidebar-bar';

// UIX and card-mod both installed (someone mid-migration). UIX alone must
// style the sidebar and bar, with nothing applied twice, and card-mod must
// take over when UIX fails. Each stub renders its own color marker so a
// computed style shows which engine actually styled an element.

const TAP = { action: 'toggle' } as const;
const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

/**
 * Builds a stub engine that records calls and renders `config.style`. It can
 * be told to throw, to exercise the fallback.
 */
const renderingEngine = (marker: string) =>
  class RenderingEngine extends HTMLElement {
    /** Recorded calls, inspected by the tests. */
    static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];
    /** When true, every call throws. */
    static shouldThrow = false;

    /** Records the call and injects `config.style` into the element. */
    static applyToElement(element: HTMLElement, type: string, config: unknown): void {
      if (RenderingEngine.shouldThrow) {
        throw new Error(`${marker} failed`);
      }
      RenderingEngine.calls.push({ element, type, config });
      const css = (config as { style?: unknown })?.style;
      if (typeof css !== 'string') {
        return;
      }
      const target = element.shadowRoot ?? element;
      const style = document.createElement('style');
      style.dataset.engine = marker;
      style.textContent = css;
      target.appendChild(style);
    }
  };

const Uix = renderingEngine('uix');
const CardMod = renderingEngine('card-mod');

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

const colorAt = (el: DashboardSidebar, loc: string): string => {
  const node = el.shadowRoot?.querySelector(`[data-loc="${loc}"]`) as HTMLElement;
  expect(node, `element ${loc}`).to.exist;
  return getComputedStyle(node).color;
};

/** Every <style> an engine injected anywhere in the sidebar, by engine. */
const injected = (el: Element, engine: string): number =>
  el.shadowRoot?.querySelectorAll(`style[data-engine="${engine}"]`).length ?? 0;

/** A sidebar styled at every level, under both keys. */
const styled = (): DashboardSidebarConfig => ({
  uix: { style: `.dashboard-sidebar-title { color: ${RED}; }` },
  header: [
    {
      type: 'title',
      text: 'One',
      card_mod: { style: `.dashboard-sidebar-title { color: ${BLUE}; }` },
    },
    { type: 'title', text: 'Two' },
  ],
  footer: {
    buttons: [
      {
        icon: 'mdi:cog',
        tap_action: TAP,
        uix: { style: `.dashboard-sidebar-footer-btn { color: ${RED}; }` },
      },
    ],
  },
});

describe('<dashboard-sidebar> with both UIX and card-mod installed', () => {
  before(() => {
    customElements.define('card-mod', CardMod);
    customElements.define('uix-node', Uix);
  });

  beforeEach(() => {
    Uix.calls = [];
    CardMod.calls = [];
    Uix.shouldThrow = false;
    CardMod.shouldThrow = false;
    window.localStorage.clear();
  });

  it('styles everything through UIX and never calls card-mod', async () => {
    const el = await mount(styled());
    expect(Uix.calls.map((c) => c.type)).to.include.members([
      'dashboard-sidebar',
      'dashboard-sidebar:header:0',
      'dashboard-sidebar:footer:btn:0',
    ]);
    expect(CardMod.calls, 'card-mod untouched').to.have.length(0);
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
    expect(colorAt(el, 'header:1')).to.equal(RED);
    expect(colorAt(el, 'footer:btn:0')).to.equal(RED);
  });

  it('applies each style exactly once, with no double styling', async () => {
    const el = await mount(styled());
    const rerender = el as unknown as { requestUpdate: () => void };
    rerender.requestUpdate();
    await el.updateComplete;
    const count = (type: string) => Uix.calls.filter((c) => c.type === type).length;
    expect(count('dashboard-sidebar')).to.equal(1);
    expect(count('dashboard-sidebar:header:0')).to.equal(1);
    expect(count('dashboard-sidebar:footer:btn:0')).to.equal(1);
    expect(injected(el, 'card-mod'), 'no card-mod styles anywhere').to.equal(0);
  });

  it('falls back to card-mod for the whole sidebar and its elements when UIX fails', async () => {
    Uix.shouldThrow = true;
    const el = await mount(styled());
    expect(Uix.calls).to.have.length(0);
    expect(CardMod.calls.map((c) => c.type)).to.include.members([
      'dashboard-sidebar',
      'dashboard-sidebar:header:0',
      'dashboard-sidebar:footer:btn:0',
    ]);
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
    expect(colorAt(el, 'header:1')).to.equal(RED);
    expect(colorAt(el, 'footer:btn:0')).to.equal(RED);
  });

  it('applies nothing when both fail, then styles on the next render once UIX recovers', async () => {
    Uix.shouldThrow = true;
    CardMod.shouldThrow = true;
    const el = await mount(styled());
    expect(colorAt(el, 'header:1')).to.not.equal(RED);
    Uix.shouldThrow = false;
    (el as unknown as { requestUpdate: () => void }).requestUpdate();
    await el.updateComplete;
    expect(colorAt(el, 'header:0')).to.equal(BLUE);
    expect(colorAt(el, 'header:1')).to.equal(RED);
    expect(CardMod.calls).to.have.length(0);
  });
});

describe('<dashboard-sidebar-bar> with both UIX and card-mod installed', () => {
  beforeEach(() => {
    Uix.calls = [];
    CardMod.calls = [];
    Uix.shouldThrow = false;
    CardMod.shouldThrow = false;
  });

  const bar = (): DashboardSidebarConfig => ({
    body: [{ type: 'item', title: 'A', icon: 'mdi:home', tap_action: TAP }],
    mobile: { mode: 'mirror', uix: { style: `:host { color: ${RED}; }` } },
  });

  it('styles the bar through UIX only', async () => {
    const el = await mountBar(bar());
    expect(Uix.calls.map((c) => c.type)).to.include('dashboard-sidebar-bar');
    expect(CardMod.calls).to.have.length(0);
    expect(getComputedStyle(el).color).to.equal(RED);
  });

  it('falls back to card-mod for the bar when UIX fails', async () => {
    Uix.shouldThrow = true;
    const el = await mountBar(bar());
    expect(CardMod.calls.map((c) => c.type)).to.include('dashboard-sidebar-bar');
    expect(getComputedStyle(el).color).to.equal(RED);
  });
});
