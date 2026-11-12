import { aTimeout, expect } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';

import { ensureSidebar } from './bootstrap';
import { TOGGLE_EVENT } from './const';
import type { DashboardSidebarConfig } from './types';
import '../dashboard-sidebar';
import '../dashboard-sidebar-bar';

// The real mount code (ensureSidebar) driven against a stand-in for Home
// Assistant's frontend: the same shadow-root path down to hui-root and its
// #view. Covers #4: visibility as the user, screen and states change, edit
// mode, and the slide (none on load, none with animate: false or reduced
// motion, which has its own page: bootstrap.reduced-motion.browser.test.ts).

const TAP = { action: 'none' } as const;

/** The stand-in frontend's two handles the tests poke at. */
interface Fake {
  /** The <home-assistant> root, which carries hass. */
  ha: HTMLElement & { hass?: unknown };
  /** The hui-root, which carries the Lovelace config and edit mode. */
  hui: HTMLElement & { lovelace?: { config: Record<string, unknown>; editMode: boolean } };
}

/** Builds home-assistant > home-assistant-main > partial-panel-resolver > ha-panel-lovelace > hui-root > #view. */
const fakeFrontend = (config: DashboardSidebarConfig, hass: unknown, editMode = false): Fake => {
  const ha = document.createElement('home-assistant') as Fake['ha'];
  const main = document.createElement('home-assistant-main');
  const resolver = document.createElement('partial-panel-resolver');
  const panel = document.createElement('ha-panel-lovelace');
  const hui = document.createElement('hui-root') as Fake['hui'];
  ha.attachShadow({ mode: 'open' }).appendChild(main);
  main.attachShadow({ mode: 'open' }).appendChild(resolver);
  resolver.appendChild(panel);
  panel.attachShadow({ mode: 'open' }).appendChild(hui);
  const view = document.createElement('div');
  view.id = 'view';
  view.style.height = '400px';
  hui.attachShadow({ mode: 'open' }).appendChild(view);
  ha.hass = hass;
  hui.lovelace = { config: { dashboard_sidebar: config }, editMode };
  document.body.appendChild(ha);
  return { ha, hui };
};

const wrapper = (f: Fake): HTMLElement | null =>
  f.hui.shadowRoot!.getElementById('dashboard-sidebar-wrapper');

const host = (f: Fake): HTMLElement =>
  f.hui.shadowRoot!.getElementById('dashboard-sidebar-host') as HTMLElement;

/** Lets the first render, its collapse toggle and the settle frames land. */
const settle = async (): Promise<void> => {
  await aTimeout(0);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await aTimeout(0);
};

const body: DashboardSidebarConfig['body'] = [{ type: 'item', title: 'A', tap_action: TAP }];
const userHass = (id: string, states: Record<string, { state: string }> = {}) => ({
  user: { id },
  states,
});

let fake: Fake | undefined;

afterEach(() => {
  fake?.ha.remove();
  fake = undefined;
  window.localStorage.clear();
});

describe('sidebar visibility (#4)', () => {
  it('mounts with no visibility conditions', () => {
    fake = fakeFrontend({ body }, userHass('u1'));
    ensureSidebar();
    expect(wrapper(fake)?.querySelector('dashboard-sidebar')).to.exist;
  });

  it('shows only to the listed users, and follows a change of user', () => {
    const config: DashboardSidebarConfig = {
      body,
      visibility: [{ condition: 'user', users: ['stefan'] }],
    };
    fake = fakeFrontend(config, userHass('peter'));
    ensureSidebar();
    expect(wrapper(fake), 'hidden from peter').to.equal(null);
    expect(fake.hui.shadowRoot!.getElementById('view')?.parentElement, 'view untouched').to.equal(
      null,
    );
    fake.ha.hass = userHass('stefan');
    ensureSidebar();
    expect(wrapper(fake), 'shown to stefan').to.exist;
    fake.ha.hass = userHass('peter');
    ensureSidebar();
    expect(wrapper(fake), 'gone again').to.equal(null);
    // the view is put back where it was, not lost with the wrapper
    expect(fake.hui.shadowRoot!.getElementById('view')).to.exist;
  });

  it('follows an entity state', () => {
    const config: DashboardSidebarConfig = {
      body,
      visibility: [{ condition: 'state', entity: 'input_boolean.kiosk', state: 'off' }],
    };
    fake = fakeFrontend(config, userHass('u1', { 'input_boolean.kiosk': { state: 'on' } }));
    ensureSidebar();
    expect(wrapper(fake)).to.equal(null);
    fake.ha.hass = userHass('u1', { 'input_boolean.kiosk': { state: 'off' } });
    ensureSidebar();
    expect(wrapper(fake)).to.exist;
  });

  it('follows a screen condition as the window resizes', async () => {
    const config: DashboardSidebarConfig = {
      body,
      visibility: [{ condition: 'screen', media_query: '(min-width: 900px)' }],
    };
    await setViewport({ width: 800, height: 600 });
    fake = fakeFrontend(config, userHass('u1'));
    ensureSidebar();
    expect(wrapper(fake), 'narrow: hidden').to.equal(null);
    await setViewport({ width: 1000, height: 600 });
    ensureSidebar();
    expect(wrapper(fake), 'wide: shown').to.exist;
  });

  it('always shows while the dashboard is being edited', () => {
    fake = fakeFrontend(
      { body, visibility: [{ condition: 'user', users: ['someone-else'] }] },
      userHass('u1'),
      true,
    );
    ensureSidebar();
    expect(wrapper(fake)).to.exist;
  });
});

describe('the dashboard slide (#4)', () => {
  it('does not slide while the sidebar settles in, then slides normally', async () => {
    fake = fakeFrontend({ body }, userHass('u1'));
    ensureSidebar();
    const w = wrapper(fake)!;
    expect(w.hasAttribute('data-settling'), 'settling at first').to.equal(true);
    expect(getComputedStyle(host(fake)).transitionDuration).to.equal('0s');
    await settle();
    expect(w.hasAttribute('data-settling'), 'settled').to.equal(false);
    expect(getComputedStyle(host(fake)).transitionDuration).to.equal('0.25s');
  });

  it('applies a remembered or configured collapse with no slide on load', async () => {
    fake = fakeFrontend({ body, start_collapsed: true }, userHass('u1'));
    let settlingAtToggle: boolean | undefined;
    fake.hui.shadowRoot!.addEventListener(
      TOGGLE_EVENT,
      () => {
        settlingAtToggle = wrapper(fake!)?.hasAttribute('data-settling');
      },
      true,
    );
    ensureSidebar();
    await settle();
    expect(wrapper(fake)?.classList.contains('collapsed'), 'collapsed').to.equal(true);
    expect(settlingAtToggle, 'the collapse landed while settling (no slide)').to.equal(true);
  });

  it('never slides with animate: false', async () => {
    fake = fakeFrontend({ body, animate: false }, userHass('u1'));
    ensureSidebar();
    await settle();
    expect(getComputedStyle(host(fake)).transitionDuration).to.equal('0s');
    const sidebar = wrapper(fake)!.querySelector('dashboard-sidebar')!;
    expect(sidebar.hasAttribute('data-no-animate')).to.equal(true);
  });
});
