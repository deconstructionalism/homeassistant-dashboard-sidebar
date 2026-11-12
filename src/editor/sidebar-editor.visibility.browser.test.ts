import { expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// The Settings tab's #4 fields: the Animate toggle and Visibility. Outside
// Home Assistant (no ha-card-conditions-editor) Visibility is a YAML field.

const TAP = { action: 'toggle' } as const;

const cfg = (extra: Partial<DashboardSidebarConfig> = {}): DashboardSidebarConfig => ({
  body: [{ type: 'item', title: 'A', tap_action: TAP }],
  ...extra,
});

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebarEditor> => {
  const el = await fixture<DashboardSidebarEditor>(
    html`<dashboard-sidebar-editor></dashboard-sidebar-editor>`,
  );
  el.config = config;
  await el.updateComplete;
  const settings = [...el.shadowRoot!.querySelectorAll('.tab')].find(
    (b) => b.textContent?.trim() === 'Settings',
  ) as HTMLButtonElement;
  settings.click();
  await el.updateComplete;
  return el;
};

const root = (el: DashboardSidebarEditor): ShadowRoot => el.shadowRoot as ShadowRoot;

const save = (el: DashboardSidebarEditor): DashboardSidebarConfig | undefined => {
  let saved: DashboardSidebarConfig | undefined;
  el.onSave = (c) => {
    saved = c;
  };
  (root(el).querySelector('footer .primary') as HTMLButtonElement).click();
  return saved;
};

/** The Animate checkbox. */
const animate = (el: DashboardSidebarEditor): HTMLInputElement => {
  const label = [...root(el).querySelectorAll('label.field-inline')].find(
    (l) => l.querySelector('.check-label > span')?.textContent?.trim() === 'Animate',
  );
  return label?.querySelector('input[type="checkbox"]') as HTMLInputElement;
};

/** The Visibility YAML textarea (the fallback outside Home Assistant). */
const visibility = (el: DashboardSidebarEditor): HTMLTextAreaElement => {
  const label = [...root(el).querySelectorAll('label.field')].find(
    (l) => l.querySelector('span')?.textContent?.trim() === 'Visibility YAML',
  );
  return label?.querySelector('textarea') as HTMLTextAreaElement;
};

describe('<dashboard-sidebar-editor> Animate (#4)', () => {
  it('is on by default, and off for animate: false', async () => {
    expect(animate(await mount(cfg())).checked).to.equal(true);
    expect(animate(await mount(cfg({ animate: false }))).checked).to.equal(false);
  });

  it('saves animate: false when turned off, and drops the key when turned back on', async () => {
    const el = await mount(cfg());
    animate(el).click();
    await el.updateComplete;
    expect(save(el)?.animate).to.equal(false);
    animate(el).click();
    await el.updateComplete;
    expect(save(el)?.animate).to.equal(undefined);
  });
});

describe('<dashboard-sidebar-editor> Visibility (#4)', () => {
  it('shows existing conditions and explains them', async () => {
    const conditions = [{ condition: 'user' as const, users: ['abc'] }];
    const el = await mount(cfg({ visibility: conditions }));
    expect(JSON.parse(visibility(el).value)).to.deep.equal(conditions);
    expect(root(el).querySelector('.visibility-hint')?.textContent).to.contain(
      'While the dashboard is being edited it always shows',
    );
  });

  it('saves conditions typed in, and drops the key when emptied', async () => {
    const el = await mount(cfg());
    const conditions = [{ condition: 'screen', media_query: '(min-width: 1024px)' }];
    visibility(el).value = JSON.stringify(conditions);
    visibility(el).dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(save(el)?.visibility).to.deep.equal(conditions);
    visibility(el).value = '';
    visibility(el).dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(save(el)?.visibility).to.equal(undefined);
  });

  it("uses Home Assistant's conditions editor when the frontend has it", async () => {
    let received: unknown;
    customElements.define(
      'ha-card-conditions-editor',
      class extends HTMLElement {
        /** Records the conditions the editor hands it. */
        set conditions(v: unknown) {
          received = v;
        }
      },
    );
    const conditions = [{ condition: 'user' as const, users: ['abc'] }];
    const el = await mount(cfg({ visibility: conditions }));
    const ha = root(el).querySelector('ha-card-conditions-editor') as HTMLElement;
    expect(ha, "HA's editor").to.exist;
    expect(received).to.deep.equal(conditions);
    ha.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: [{ condition: 'user', users: ['xyz'] }] },
      }),
    );
    await el.updateComplete;
    expect(save(el)?.visibility).to.deep.equal([{ condition: 'user', users: ['xyz'] }]);
  });
});
