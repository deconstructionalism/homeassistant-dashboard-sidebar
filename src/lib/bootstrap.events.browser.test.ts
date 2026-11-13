import { expect } from '@open-wc/testing';
import { LitElement, html } from 'lit';

import { startSidebar } from './bootstrap';
import '../dashboard-sidebar';
import '../dashboard-sidebar-bar';

// The event-driven loop (#4): with no polling, the sidebar must follow hass
// (through <home-assistant>'s provideHass), the dashboard (through hui-root's
// Lit updates), and server pushes from subscribe_condition. Its own page,
// since startSidebar hooks the window once and the stand-ins are defined
// here as Home Assistant's real elements behave.

/** A hass stand-in. */
type Hass = Record<string, unknown>;

/** Stands in for <home-assistant>: hands each new hass to its providers. */
class FakeHomeAssistant extends HTMLElement {
  public providers: Array<{ hass?: Hass }> = [];
  private _hass?: Hass;
  /** Registers an element to receive every new hass. */
  public provideHass(el: { hass?: Hass }): void {
    this.providers.push(el);
    el.hass = this._hass;
  }
  /** The current hass. */
  public get hass(): Hass | undefined {
    return this._hass;
  }
  /** Sets hass and hands it to every provider. */
  public set hass(h: Hass | undefined) {
    this._hass = h;
    for (const p of this.providers) p.hass = h;
  }
}
customElements.define('home-assistant', FakeHomeAssistant);

/** Stands in for hui-root: a Lit element that re-renders on hass and lovelace. */
class FakeHuiRoot extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    lovelace: { attribute: false },
  };
  /** Passed down by the panel, as in Home Assistant. */
  public hass?: Hass;
  /** The dashboard config and edit mode. */
  public lovelace?: { config: Record<string, unknown>; editMode: boolean };
  /** The view the sidebar wraps. */
  protected override render(): unknown {
    return html`<div id="view" style="height:300px"></div>`;
  }
}
customElements.define('hui-root', FakeHuiRoot);

/** subscribe_condition stand-in: records each subscription and lets the test push. */
const subs: Array<{ condition: unknown; push: (m: unknown) => void; closed: boolean }> = [];
const connection = {
  subscribeMessage: (push: (m: unknown) => void, msg: { condition: unknown }) => {
    const sub = { condition: msg.condition, push, closed: false };
    subs.push(sub);
    return Promise.resolve(() => {
      sub.closed = true;
    });
  },
};

const ha = document.createElement('home-assistant') as FakeHomeAssistant;
const hui = document.createElement('hui-root') as FakeHuiRoot;
const main = document.createElement('home-assistant-main');
const resolver = document.createElement('partial-panel-resolver');
const panel = document.createElement('ha-panel-lovelace');
ha.attachShadow({ mode: 'open' }).appendChild(main);
main.attachShadow({ mode: 'open' }).appendChild(resolver);
resolver.appendChild(panel);
panel.attachShadow({ mode: 'open' }).appendChild(hui);

let states: Record<string, unknown> = { 'input_boolean.kiosk': { state: 'off', attributes: {} } };
const push = (userId = 'u1'): void => {
  const h = { user: { id: userId }, states, locale: {}, config: {}, connection };
  ha.hass = h;
  hui.hass = h;
};
const setLovelace = (dashboard_sidebar: unknown, editMode = false): void => {
  hui.lovelace = { config: { dashboard_sidebar }, editMode };
};
const body = [{ type: 'item', title: 'A', tap_action: { action: 'none' } }];

const wrapper = (): HTMLElement | null =>
  hui.shadowRoot!.getElementById('dashboard-sidebar-wrapper');
const sidebar = () => wrapper()?.querySelector('dashboard-sidebar') as HTMLElement | null;

/** Lets microtasks (the queued check) and Lit's updates run, but no timers. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await hui.updateComplete;
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

/** Every setInterval the sidebar starts, to prove there is no poll. */
const intervals: number[] = [];
const realSetInterval = window.setInterval.bind(window);
window.setInterval = ((fn: TimerHandler, ms?: number, ...rest: unknown[]) => {
  intervals.push(ms ?? 0);
  return realSetInterval(fn, ms, ...rest);
}) as typeof window.setInterval;

before(async () => {
  push();
  setLovelace({ body });
  document.body.appendChild(ha);
  await hui.updateComplete;
  startSidebar();
  await flush();
});

describe('event-driven sidebar (#4)', () => {
  it('registers one hass provider, and runs no polling timer', () => {
    expect(ha.providers).to.have.length(1);
    expect(wrapper(), 'mounted').to.exist;
    expect(intervals, 'no setInterval').to.deep.equal([]);
  });

  it('follows a state change handed over through provideHass, with no timer', async () => {
    setLovelace({
      body,
      visibility: [{ condition: 'state', entity: 'input_boolean.kiosk', state: 'off' }],
    });
    await flush();
    expect(wrapper()).to.exist;
    states = { 'input_boolean.kiosk': { state: 'on', attributes: {} } };
    ha.hass = { ...ha.hass, states }; // only <home-assistant> changes
    await flush();
    expect(wrapper(), 'hidden on the push').to.equal(null);
    states = { 'input_boolean.kiosk': { state: 'off', attributes: {} } };
    push();
    await flush();
    expect(wrapper()).to.exist;
  });

  it('follows a config save or an edit-mode toggle through hui-root updates', async () => {
    const hidden = { body, visibility: [{ condition: 'user', users: ['someone-else'] }] };
    setLovelace(hidden);
    await flush();
    expect(wrapper(), 'hidden from you').to.equal(null);
    setLovelace(hidden, true);
    await flush();
    expect(wrapper(), 'shown while editing').to.exist;
    setLovelace({ body }, true);
    await flush();
    setLovelace({ body });
    await flush();
    expect(wrapper(), 'no conditions').to.exist;
  });

  it('marks a sidebar hidden from you while editing, with the eye-off badge', async () => {
    setLovelace({ body, visibility: [{ condition: 'user', users: ['someone-else'] }] }, true);
    await flush();
    const el = sidebar() as HTMLElement & { updateComplete: Promise<unknown> };
    await el.updateComplete;
    expect(el.hasAttribute('hidden-by-visibility')).to.equal(true);
    expect(el.shadowRoot!.querySelector('.edit-btn .hidden-badge')).to.exist;
    setLovelace({ body, visibility: [{ condition: 'user', users: ['u1'] }] }, true);
    await flush();
    await el.updateComplete;
    expect(sidebar()!.hasAttribute('hidden-by-visibility')).to.equal(false);
    expect(sidebar()!.shadowRoot!.querySelector('.hidden-badge')).to.equal(null);
    setLovelace({ body });
    await flush();
  });

  it('waits for the server, then follows its pushes', async () => {
    const template = {
      condition: 'template',
      value_template: '{{ is_state("sun.sun", "below_horizon") }}',
    };
    setLovelace({ body: [{ type: 'item', title: 'B', tap_action: { action: 'none' } }] });
    await flush();
    expect(wrapper(), 'mounted before').to.exist;
    setLovelace({ body, visibility: [template] });
    await flush();
    const sub = subs[subs.length - 1];
    expect(sub.condition).to.deep.equal(template);
    expect(wrapper(), 'kept while the server has not answered').to.exist;
    sub.push({ result: false });
    await flush();
    expect(wrapper(), 'hidden on a false push').to.equal(null);
    sub.push({ result: true });
    await flush();
    expect(wrapper(), 'back on a true push').to.exist;
    sub.push({ error: 'template error' });
    await flush();
    expect(wrapper(), 'an error reads as false').to.equal(null);
    setLovelace({ body });
    await flush();
    expect(sub.closed, 'unsubscribed once the condition is gone').to.equal(true);
  });
});
