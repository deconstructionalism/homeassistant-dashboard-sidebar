import { expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// The visual editor with only card-mod installed: the Styles fields still
// work, say card-mod applies them and that UIX is recommended, and save under
// `uix:` (which card-mod renders too). Its own page so the engine is card-mod.

const TAP = { action: 'toggle' } as const;

/** A stand-in for card-mod's element; the editor only checks it is installed. */
class StubCardMod extends HTMLElement {
  /** card-mod's apply surface (unused by these tests). */
  static applyToElement(): void {}
}

const cfg = (): DashboardSidebarConfig => ({
  header: [{ type: 'title', text: 'Home' }],
  body: [{ type: 'item', title: 'A', tap_action: TAP }],
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

const tab = async (el: DashboardSidebarEditor, label: string): Promise<void> => {
  const btn = [...root(el).querySelectorAll('.tab')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLButtonElement;
  btn.click();
  await el.updateComplete;
};

describe('<dashboard-sidebar-editor> with only card-mod installed', () => {
  before(() => {
    customElements.define('card-mod', StubCardMod);
  });

  it('shows the Styles field and says card-mod applies it, with UIX recommended', async () => {
    const el = await mount(cfg());
    await tab(el, 'Settings');
    expect(root(el).querySelector('.styling-missing'), 'no install prompt').to.not.exist;
    const hint = root(el).querySelector('.styling-hint');
    expect(hint?.textContent).to.contain('Applied by card-mod');
    expect(hint?.textContent).to.contain('UIX is recommended');
    expect(hint?.textContent).to.contain('deprecated');
    const links = [...(hint?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
    expect(links).to.include('https://github.com/Lint-Free-Technology/uix');
    expect(links).to.include('https://github.com/thomasloven/lovelace-card-mod');
  });

  it('still saves new styles under uix, which card-mod renders too', async () => {
    const el = await mount(cfg());
    await tab(el, 'Settings');
    const label = [...root(el).querySelectorAll<HTMLLabelElement>('label.field')].find(
      (l) => l.querySelector('span')?.textContent?.trim() === 'Styles YAML',
    );
    const ta = label?.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = JSON.stringify({ style: ':host { color: red; }' });
    ta.dispatchEvent(new Event('input'));
    await el.updateComplete;
    let saved: DashboardSidebarConfig | undefined;
    el.onSave = (c) => {
      saved = c;
    };
    (root(el).querySelector('footer .primary') as HTMLButtonElement).click();
    expect(saved?.uix).to.deep.equal({ style: ':host { color: red; }' });
  });
});
