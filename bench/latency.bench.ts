/**
 * Visibility latency and idle cost, old (1s poll) vs new (events), against a
 * stand-in frontend that behaves like Home Assistant's where it matters:
 * <home-assistant> hands hass to providers (provideHass) and to hui-root, and
 * hui-root is a Lit element that re-renders when hass or lovelace change.
 *
 * Uses only startSidebar / ensureSidebar, which both versions export, so the
 * same file measures either one. Run with: npm run bench
 */
import { emulateMedia } from '@web/test-runner-commands';
import { LitElement, html } from 'lit';

import { ensureSidebar, startSidebar } from '../src/lib/bootstrap';
import '../src/dashboard-sidebar';
import '../src/dashboard-sidebar-bar';

type Hass = Record<string, unknown>;

class FakeHomeAssistant extends HTMLElement {
  private _hass?: Hass;
  private _providers: Array<{ hass?: Hass }> = [];
  public provideHass(el: { hass?: Hass }): void {
    this._providers.push(el);
    el.hass = this._hass;
  }
  public get hass(): Hass | undefined {
    return this._hass;
  }
  public set hass(h: Hass | undefined) {
    this._hass = h;
    for (const p of this._providers) p.hass = h;
  }
}
customElements.define('home-assistant', FakeHomeAssistant);

class FakeHuiRoot extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    lovelace: { attribute: false },
  };
  public hass?: Hass;
  public lovelace?: { config: Record<string, unknown>; editMode: boolean };
  protected override render(): unknown {
    return html`<div id="view" style="height:300px"></div>`;
  }
}
customElements.define('hui-root', FakeHuiRoot);

const ha = document.createElement('home-assistant') as FakeHomeAssistant;
const main = document.createElement('home-assistant-main');
const resolver = document.createElement('partial-panel-resolver');
const panel = document.createElement('ha-panel-lovelace');
const hui = document.createElement('hui-root') as FakeHuiRoot;
ha.attachShadow({ mode: 'open' }).appendChild(main);
main.attachShadow({ mode: 'open' }).appendChild(resolver);
resolver.appendChild(panel);
panel.attachShadow({ mode: 'open' }).appendChild(hui);

const kiosk = (state: string) => ({ state, attributes: {} });
let states: Record<string, unknown> = { 'input_boolean.kiosk': kiosk('off') };
let user = 'u1';
/** A fresh hass object, as Home Assistant makes on every change. */
/** subscribe_condition stand-in; the test pushes results itself. */
const subs: Array<(m: unknown) => void> = [];
const connection = {
  subscribeMessage: (cb: (m: unknown) => void) => {
    subs.push(cb);
    return Promise.resolve(() => undefined);
  },
};
const push = (): void => {
  const h = { user: { id: user }, states, locale: {}, config: {}, connection };
  ha.hass = h;
  hui.hass = h;
};
const setLovelace = (dashboard_sidebar: unknown, editMode = false): void => {
  hui.lovelace = { config: { dashboard_sidebar }, editMode };
};

const body = [{ type: 'item', title: 'A', tap_action: { action: 'none' } }];
const shown = (): boolean => !!hui.shadowRoot?.getElementById('dashboard-sidebar-wrapper');

/** Milliseconds from `act` until the sidebar is (or isn't) on the page. */
const until = async (want: boolean, act: () => unknown, limit = 5000): Promise<number> => {
  const start = performance.now();
  await act();
  while (shown() !== want) {
    if (performance.now() - start > limit) return NaN;
    await new Promise((r) => setTimeout(r, 2));
  }
  return performance.now() - start;
};

/** Random 0-1s pause, so changes land at random points of any poll. */
const jitter = () => new Promise((r) => setTimeout(r, Math.random() * 1000));

const stats = (all: number[]) => {
  const xs = all.filter((x) => !Number.isNaN(x));
  if (xs.length === 0) return 'never (not supported)';
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return {
    n: s.length,
    median: +q(0.5).toFixed(1),
    p95: +q(0.95).toFixed(1),
    max: +s[s.length - 1].toFixed(1),
  };
};

const results: Record<string, unknown> = {};
const N = 15;

/** Counts sidebar mount checks: each one looks up the wrapper by id. */
let checks = 0;
const getById = ShadowRoot.prototype.getElementById;
ShadowRoot.prototype.getElementById = function (this: ShadowRoot, id: string) {
  if (id === 'dashboard-sidebar-wrapper') checks += 1;
  return getById.call(this, id);
};

describe('visibility latency', function () {
  this.timeout(600000);

  before(async () => {
    push();
    setLovelace({ body });
    document.body.appendChild(ha);
    await hui.updateComplete;
    startSidebar();
  });

  it('entity state change', async () => {
    setLovelace({
      body,
      visibility: [{ condition: 'state', entity: 'input_boolean.kiosk', state: 'off' }],
    });
    states = { 'input_boolean.kiosk': kiosk('off') };
    push();
    await until(true, () => undefined);
    const hide: number[] = [];
    const show: number[] = [];
    for (let i = 0; i < N; i++) {
      await jitter();
      hide.push(
        await until(false, () => {
          states = { 'input_boolean.kiosk': kiosk('on') };
          push();
        }),
      );
      await jitter();
      show.push(
        await until(true, () => {
          states = { 'input_boolean.kiosk': kiosk('off') };
          push();
        }),
      );
    }
    results['state: hide'] = stats(hide);
    results['state: show'] = stats(show);
  });

  it('user switch', async () => {
    setLovelace({ body, visibility: [{ condition: 'user', users: ['u1'] }] });
    user = 'u1';
    push();
    await until(true, () => undefined);
    const xs: number[] = [];
    for (let i = 0; i < N; i++) {
      await jitter();
      xs.push(
        await until(false, () => {
          user = 'u2';
          push();
        }),
      );
      await jitter();
      xs.push(
        await until(true, () => {
          user = 'u1';
          push();
        }),
      );
    }
    results['user'] = stats(xs);
  });

  it('screen query that flips without a resize (dark mode)', async () => {
    await emulateMedia({ colorScheme: 'light' });
    setLovelace({
      body,
      visibility: [{ condition: 'screen', media_query: '(prefers-color-scheme: dark)' }],
    });
    push();
    await until(false, () => undefined);
    const xs: number[] = [];
    for (let i = 0; i < N; i++) {
      await jitter();
      xs.push(await until(true, () => emulateMedia({ colorScheme: 'dark' })));
      await jitter();
      xs.push(await until(false, () => emulateMedia({ colorScheme: 'light' })));
    }
    results['screen (no resize)'] = stats(xs);
    await emulateMedia({ colorScheme: 'light' });
  });

  it('time boundary', async () => {
    const xs: number[] = [];
    for (let i = 0; i < 6; i++) {
      // a window opening 1.2-2.2s from now, in the browser's zone
      const at = new Date(Date.now() + 1200 + Math.random() * 1000);
      const hhmmss = (d: Date) =>
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, '0'))
          .join(':');
      setLovelace({ body, visibility: [{ condition: 'time', after: hhmmss(at) }] });
      push();
      await until(false, () => undefined);
      const boundary = new Date(at);
      boundary.setMilliseconds(0);
      const waited = await until(true, () => undefined, 6000);
      xs.push(Number.isNaN(waited) ? NaN : Date.now() - boundary.getTime());
    }
    results['time (after boundary)'] = stats(xs);
  });

  it('server push (template condition)', async () => {
    setLovelace({ body: [{ type: 'item', title: 'B', tap_action: { action: 'none' } }] });
    push();
    await until(true, () => undefined);
    const before = subs.length;
    setLovelace({ body, visibility: [{ condition: 'template', value_template: '{{ x }}' }] });
    push();
    await new Promise((r) => setTimeout(r, 1500));
    const send = subs[before];
    const xs: number[] = [];
    for (let i = 0; i < N; i++) {
      await jitter();
      xs.push(send ? await until(false, () => send({ result: false }), 3000) : NaN);
      await jitter();
      xs.push(send ? await until(true, () => send({ result: true }), 3000) : NaN);
    }
    results['server push'] = stats(xs);
  });

  it('edit mode on, with a sidebar hidden from you', async () => {
    const config = { body, visibility: [{ condition: 'user', users: ['someone-else'] }] };
    setLovelace(config);
    push();
    await until(false, () => undefined);
    const xs: number[] = [];
    for (let i = 0; i < N; i++) {
      await jitter();
      xs.push(await until(true, () => setLovelace(config, true)));
      await jitter();
      xs.push(await until(false, () => setLovelace(config, false)));
    }
    results['edit mode toggle'] = stats(xs);
  });

  it('idle cost: one minute with no changes at all', async () => {
    setLovelace({ body, visibility: [{ condition: 'user', users: ['u1'] }] });
    user = 'u1';
    push();
    await until(true, () => undefined);
    await new Promise((r) => setTimeout(r, 500));
    checks = 0;
    await new Promise((r) => setTimeout(r, 60000));
    results['idle: checks per minute'] = checks;
    // what one check costs, timed directly
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) ensureSidebar();
    results['idle: ms per check'] = +((performance.now() - t0) / 2000).toFixed(4);
  });

  it('busy house: one unrelated entity change every 200ms for a minute', async () => {
    let n = 0;
    checks = 0;
    const timer = setInterval(() => {
      n += 1;
      states = { ...states, 'sensor.power': { state: String(n), attributes: {} } };
      push();
    }, 200);
    await new Promise((r) => setTimeout(r, 60000));
    clearInterval(timer);
    results['busy: hass updates per minute'] = n;
    results['busy: checks per minute'] = checks;
  });

  after(() => {
    console.log(`BENCH ${JSON.stringify(results)}`);
  });
});
