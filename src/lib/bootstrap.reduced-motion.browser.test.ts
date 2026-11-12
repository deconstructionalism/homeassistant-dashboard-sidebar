import { aTimeout, expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';

import { ensureSidebar } from './bootstrap';
import '../dashboard-sidebar';

// Its own page: the system's reduce-motion setting is on for the whole page,
// set once (WebKit under test does not re-apply it reliably when toggled
// back and forth on one page). Nothing about the sidebar should animate.

const TAP = { action: 'none' } as const;

/** home-assistant > ... > hui-root > #view, as in bootstrap.browser.test.ts. */
const fakeFrontend = (): { ha: HTMLElement; hui: HTMLElement } => {
  const ha = document.createElement('home-assistant') as HTMLElement & { hass?: unknown };
  const main = document.createElement('home-assistant-main');
  const resolver = document.createElement('partial-panel-resolver');
  const panel = document.createElement('ha-panel-lovelace');
  const hui = document.createElement('hui-root') as HTMLElement & { lovelace?: unknown };
  ha.attachShadow({ mode: 'open' }).appendChild(main);
  main.attachShadow({ mode: 'open' }).appendChild(resolver);
  resolver.appendChild(panel);
  panel.attachShadow({ mode: 'open' }).appendChild(hui);
  const view = document.createElement('div');
  view.id = 'view';
  hui.attachShadow({ mode: 'open' }).appendChild(view);
  ha.hass = { user: { id: 'u1' }, states: {} };
  hui.lovelace = {
    config: { dashboard_sidebar: { body: [{ type: 'item', title: 'A', tap_action: TAP }] } },
    editMode: false,
  };
  document.body.appendChild(ha);
  return { ha, hui };
};

describe('with the system set to reduce motion', () => {
  before(async () => {
    await emulateMedia({ reducedMotion: 'reduce' });
  });

  it('the dashboard does not slide, even after settling in', async () => {
    const { ha, hui } = fakeFrontend();
    ensureSidebar();
    await aTimeout(0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await aTimeout(0);
    const host = hui.shadowRoot!.getElementById('dashboard-sidebar-host') as HTMLElement;
    expect(
      hui.shadowRoot!.getElementById('dashboard-sidebar-wrapper')?.hasAttribute('data-settling'),
    ).to.equal(false);
    expect(getComputedStyle(host).transitionDuration).to.equal('0s');
    ha.remove();
  });

  it("the sidebar's own animations are off (the collapse chevron)", async () => {
    const { ha, hui } = fakeFrontend();
    ensureSidebar();
    const sidebar = hui.shadowRoot!.querySelector('dashboard-sidebar') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await sidebar.updateComplete;
    const chevron = sidebar.shadowRoot!.querySelector('.toggle ha-icon') as HTMLElement;
    expect(chevron, 'collapse chevron').to.exist;
    expect(getComputedStyle(chevron).transitionDuration).to.equal('0s');
    ha.remove();
  });
});
