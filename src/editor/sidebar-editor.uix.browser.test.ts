import { expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebar } from '../dashboard-sidebar';
import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// The visual editor with UIX installed (and no card-mod): the Styles fields
// show, say UIX applies them, and always save under `uix:`, moving an old
// `card_mod:` across. Its own page so the registered engine is UIX alone.

const TAP = { action: 'toggle' } as const;

/** A stand-in for UIX's `uix-node`, recording applyToElement calls. */
class StubUix extends HTMLElement {
  /** Recorded calls, inspected by the tests. */
  static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];

  /** Records the arguments. */
  static applyToElement(element: HTMLElement, type: string, config: unknown): void {
    StubUix.calls.push({ element, type, config });
  }
}

/** A config with header, body (item + category), and a footer button. */
const cfg = (): DashboardSidebarConfig => ({
  header: [{ type: 'title', text: 'Home' }],
  body: [
    { type: 'item', title: 'A', tap_action: TAP },
    { type: 'category', title: 'Rooms', items: [{ title: 'Kitchen', tap_action: TAP }] },
  ],
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

const clickLoc = async (el: DashboardSidebarEditor, loc: string): Promise<void> => {
  const node = preview(el)?.shadowRoot?.querySelector(`[data-loc="${loc}"]`) as HTMLElement;
  node.click();
  await settle(el);
};

/** The Styles YAML field's label within `scope`, or undefined. */
const stylesFieldIn = (scope: ParentNode): HTMLLabelElement | undefined =>
  [...scope.querySelectorAll<HTMLLabelElement>('label.field')].find(
    (l) => l.querySelector('span')?.textContent?.trim() === 'Styles YAML',
  );

/** Types JSON into the Styles field within `scope` (the textarea fallback). */
const typeStyles = async (
  el: DashboardSidebarEditor,
  scope: ParentNode,
  value: unknown,
): Promise<void> => {
  const ta = stylesFieldIn(scope)?.querySelector('textarea') as HTMLTextAreaElement;
  expect(ta, 'Styles textarea').to.exist;
  ta.value = JSON.stringify(value);
  ta.dispatchEvent(new Event('input'));
  await settle(el);
};

/** Clicks Save and returns the saved config. */
const save = (el: DashboardSidebarEditor): DashboardSidebarConfig | undefined => {
  let saved: DashboardSidebarConfig | undefined;
  el.onSave = (c) => {
    saved = c;
  };
  (root(el).querySelector('footer .primary') as HTMLButtonElement).click();
  return saved;
};

describe('<dashboard-sidebar-editor> with UIX installed', () => {
  before(() => {
    customElements.define('uix-node', StubUix);
  });

  beforeEach(() => {
    StubUix.calls = [];
  });

  it('shows the Styles field, credits UIX, and lists the targetable classes', async () => {
    const el = await mount(cfg());
    await tab(el, 'Settings');
    expect(root(el).querySelector('.styling-missing'), 'no install prompt').to.not.exist;
    expect(stylesFieldIn(root(el)), 'Styles field').to.exist;
    const hint = root(el).querySelector('.styling-hint');
    expect(hint?.textContent?.trim()).to.match(/^Styled by UIX\./);
    expect(hint?.textContent).to.not.contain('card-mod');
    expect(root(el).querySelector('.class-ref'), 'targetable classes').to.exist;
  });

  it('saves sidebar styles under uix', async () => {
    const el = await mount(cfg());
    await tab(el, 'Settings');
    await typeStyles(el, root(el), { style: ':host { color: red; }' });
    const saved = save(el);
    expect(saved?.uix).to.deep.equal({ style: ':host { color: red; }' });
    // Cleared like every editor field: undefined, which saving drops.
    expect(saved?.card_mod).to.equal(undefined);
  });

  it('shows an existing card_mod and moves it to uix when edited', async () => {
    const legacy = { style: ':host { color: blue; }' };
    const el = await mount({ ...cfg(), card_mod: legacy });
    await tab(el, 'Settings');
    const ta = stylesFieldIn(root(el))?.querySelector('textarea') as HTMLTextAreaElement;
    expect(JSON.parse(ta.value)).to.deep.equal(legacy);
    await typeStyles(el, root(el), { style: ':host { color: green; }' });
    const saved = save(el);
    expect(saved?.uix).to.deep.equal({ style: ':host { color: green; }' });
    expect(saved?.card_mod).to.equal(undefined);
  });

  it('leaves an untouched card_mod exactly as it was', async () => {
    const legacy = { style: ':host { color: blue; }' };
    const el = await mount({ ...cfg(), card_mod: legacy });
    await tab(el, 'Settings');
    (root(el).querySelector('.settings input[type="checkbox"]') as HTMLInputElement).click();
    await el.updateComplete;
    const saved = save(el);
    expect(saved?.card_mod).to.deep.equal(legacy);
    expect(saved?.uix).to.equal(undefined);
  });

  it('saves an element’s styles under its uix, dropping its card_mod', async () => {
    const config = cfg();
    (config.body![0] as { card_mod?: unknown }).card_mod = { style: ':scope { color: blue; }' };
    const el = await mount(config);
    await tab(el, 'Body');
    await clickLoc(el, 'body:0');
    const form = root(el).querySelector('.form') as HTMLElement;
    expect(form.querySelector('.class-ref'), 'element classes listed').to.exist;
    await typeStyles(el, form, { style: '.dashboard-sidebar-item { color: red; }' });
    const item = save(el)?.body?.[0] as { uix?: unknown; card_mod?: unknown };
    expect(item.uix).to.deep.equal({ style: '.dashboard-sidebar-item { color: red; }' });
    expect(item.card_mod).to.equal(undefined);
  });

  it('saves a footer button’s styles under its uix', async () => {
    const el = await mount(cfg());
    await tab(el, 'Footer');
    await clickLoc(el, 'footer:btn:0');
    const form = root(el).querySelector('.form') as HTMLElement;
    await typeStyles(el, form, { style: '.dashboard-sidebar-footer-btn { color: red; }' });
    const btn = save(el)?.footer?.buttons?.[0] as { uix?: unknown };
    expect(btn.uix).to.deep.equal({ style: '.dashboard-sidebar-footer-btn { color: red; }' });
  });

  it('saves the footer row styles under footer.uix', async () => {
    const el = await mount(cfg());
    await tab(el, 'Footer');
    const section = root(el).querySelector('details.footer-settings') as HTMLElement;
    expect(section, 'Footer Settings').to.exist;
    expect(section.querySelector('.class-ref'), 'footer classes listed').to.exist;
    await typeStyles(el, section, { style: '.dashboard-sidebar-footer { gap: 12px; }' });
    expect(save(el)?.footer?.uix).to.deep.equal({
      style: '.dashboard-sidebar-footer { gap: 12px; }',
    });
  });

  it('previews the sidebar-level uix in the region tabs', async () => {
    const uix = { style: '.dashboard-sidebar-title { letter-spacing: 2px; }' };
    const el = await mount({ ...cfg(), uix });
    await tab(el, 'Header');
    const pv = preview(el);
    expect(pv, 'header preview').to.exist;
    const call = StubUix.calls.find((c) => c.element === pv && c.type === 'dashboard-sidebar');
    expect(call?.config).to.deep.equal(uix);
  });

  it('copies the desktop uix when switching to a custom bar', async () => {
    const uix = { style: '.sb-mache { color: red; }' };
    const el = await mount({ ...cfg(), uix, mobile: {} });
    await tab(el, 'Mobile Bar');
    (root(el).querySelector('.tab-notes .tool') as HTMLButtonElement).click();
    await el.updateComplete;
    (
      [...root(el).querySelectorAll('.add-menu-item')].find((b) =>
        /Switch To Custom Bar/.test(b.textContent ?? ''),
      ) as HTMLButtonElement
    ).click();
    await el.updateComplete;
    (
      [...root(el).querySelectorAll('.confirm-actions button')].find((b) =>
        /Copy Desktop Bar/.test(b.textContent ?? ''),
      ) as HTMLButtonElement
    ).click();
    await settle(el);
    expect(save(el)?.mobile?.uix).to.deep.equal(uix);
  });

  it('documents uix (and card_mod as its alias) in the custom bar YAML reference', async () => {
    const el = await mount({
      ...cfg(),
      mobile: { mode: 'custom', items: [{ type: 'item', title: 'A', tap_action: TAP }] },
    });
    await tab(el, 'Mobile Bar');
    const text = root(el).querySelector('.class-ref')?.textContent ?? '';
    expect(text).to.contain('uix:');
    expect(text).to.contain('card_mod:');
  });
});
