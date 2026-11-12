import { expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from '../dashboard-sidebar';
import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// The Footer tab's Footer Settings (#3): the button row's Align, kept through
// mode changes and shown in the preview, and the note that a custom mobile
// bar has its own footer. No styling engine on this page.

const TAP = { action: 'toggle' } as const;

const cfg = (): DashboardSidebarConfig => ({
  body: [{ type: 'item', title: 'A', tap_action: TAP }],
  footer: { buttons: [{ icon: 'mdi:cog', tap_action: TAP }] },
});

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebarEditor> => {
  const el = await fixture<DashboardSidebarEditor>(
    html`<dashboard-sidebar-editor></dashboard-sidebar-editor>`,
  );
  el.config = config;
  await el.updateComplete;
  return el;
};

const root = (el: DashboardSidebarEditor): ShadowRoot => el.shadowRoot as ShadowRoot;

const preview = (el: DashboardSidebarEditor): DashboardSidebar | null =>
  root(el).querySelector('.pv-frame dashboard-sidebar');

const settle = async (el: DashboardSidebarEditor): Promise<void> => {
  await el.updateComplete;
  await preview(el)?.updateComplete;
  await el.updateComplete;
};

const tab = async (el: DashboardSidebarEditor, label: string): Promise<void> => {
  const btn = [...root(el).querySelectorAll('.tab')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLButtonElement;
  btn.click();
  await settle(el);
};

/** The Footer Settings section, or null. */
const settings = (el: DashboardSidebarEditor): HTMLElement | null =>
  root(el).querySelector('details.footer-settings');

/** The Align select inside Footer Settings, or null. */
const alignSelect = (el: DashboardSidebarEditor): HTMLSelectElement | null => {
  const label = [...(settings(el)?.querySelectorAll('label.field') ?? [])].find(
    (l) => l.querySelector('span')?.textContent?.trim() === 'Align',
  );
  return (label?.querySelector('select') as HTMLSelectElement) ?? null;
};

const chooseAlign = async (el: DashboardSidebarEditor, value: string): Promise<void> => {
  const select = alignSelect(el) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
  await settle(el);
};

/** Changes the footer mode through the tab menu's "Change to" submenu. */
const changeFooterTo = async (el: DashboardSidebarEditor, label: string): Promise<void> => {
  (root(el).querySelector('.tab-notes .tool') as HTMLButtonElement).click();
  await el.updateComplete;
  (
    [...root(el).querySelectorAll('.add-menu-item')].find((b) =>
      b.textContent?.includes('Change to'),
    ) as HTMLButtonElement
  ).click();
  await el.updateComplete;
  (
    [...root(el).querySelectorAll('.add-menu-item.submenu-item')].find((b) =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement
  ).click();
  await settle(el);
};

const save = (el: DashboardSidebarEditor): DashboardSidebarConfig | undefined => {
  let saved: DashboardSidebarConfig | undefined;
  el.onSave = (c) => {
    saved = c;
  };
  (root(el).querySelector('footer .primary') as HTMLButtonElement).click();
  return saved;
};

describe('<dashboard-sidebar-editor> Footer Settings', () => {
  it('offers Align (left by default) and the Styles field for a button row', async () => {
    const el = await mount(cfg());
    await tab(el, 'Footer');
    expect(settings(el), 'Footer Settings').to.exist;
    expect(alignSelect(el)?.value).to.equal('left');
    expect([...(alignSelect(el)?.options ?? [])].map((o) => o.value)).to.deep.equal([
      'left',
      'center',
      'right',
    ]);
    expect(settings(el)?.querySelector('.styling-missing'), 'styles prompt').to.exist;
  });

  it('saves the chosen alignment, and drops it again for left', async () => {
    const el = await mount(cfg());
    await tab(el, 'Footer');
    await chooseAlign(el, 'right');
    expect(save(el)?.footer?.align).to.equal('right');
    await chooseAlign(el, 'left');
    expect(save(el)?.footer?.align).to.equal(undefined);
  });

  it('shows the alignment in the preview', async () => {
    const el = await mount(cfg());
    await tab(el, 'Footer');
    await chooseAlign(el, 'center');
    const row = preview(el)?.shadowRoot?.querySelector('.dashboard-sidebar-footer') as HTMLElement;
    expect(row.style.justifyContent).to.equal('center');
  });

  it('has no Align for a card or markdown footer, but keeps Footer Settings', async () => {
    const el = await mount({ ...cfg(), footer: { markdown: 'hi' } });
    await tab(el, 'Footer');
    expect(settings(el), 'Footer Settings').to.exist;
    expect(alignSelect(el)).to.equal(null);
  });

  it('keeps align, class, id and styles through a change of footer mode and back', async () => {
    const row = {
      align: 'right' as const,
      class: 'foot',
      id: 'f1',
      uix: { style: '.x {}' },
      divider: false,
    };
    const el = await mount({ ...cfg(), footer: { ...cfg().footer!, ...row } });
    await tab(el, 'Footer');
    await changeFooterTo(el, 'Markdown');
    await changeFooterTo(el, 'Button Row');
    const footer = save(el)?.footer;
    expect(footer).to.include({ align: 'right', class: 'foot', id: 'f1', divider: false });
    expect(footer?.uix).to.deep.equal({ style: '.x {}' });
    expect(footer?.buttons).to.have.length(1);
  });
});

describe('<dashboard-sidebar-editor> Footer tab with a custom mobile bar', () => {
  const NOTE = 'Your mobile bar is custom, so its footer is set in the Mobile Bar tab.';

  /** The editor notes' text on the current tab. */
  const notes = (el: DashboardSidebarEditor): string =>
    [...root(el).querySelectorAll('.editor-note')].map((n) => n.textContent ?? '').join(' ');

  it('says the custom bar has its own footer', async () => {
    const el = await mount({
      ...cfg(),
      mobile: { mode: 'custom', items: [{ type: 'item', title: 'A', tap_action: TAP }] },
    });
    await tab(el, 'Footer');
    expect(notes(el)).to.contain(NOTE);
  });

  it('says nothing of the kind for a mirrored bar, or no bar', async () => {
    for (const config of [{ ...cfg(), mobile: { mode: 'mirror' as const } }, cfg()]) {
      const el = await mount(config);
      await tab(el, 'Footer');
      expect(notes(el)).to.not.contain(NOTE);
    }
  });
});
