import { expect, fixture, html } from '@open-wc/testing';

import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// #4 in the editor: the Animate toggle on the Settings tab, and the
// Visibility tab (our own condition list and forms for every Home Assistant
// condition type). Outside Home Assistant, YAML editing is a JSON textarea.

const TAP = { action: 'toggle' } as const;

const cfg = (extra: Partial<DashboardSidebarConfig> = {}): DashboardSidebarConfig => ({
  body: [{ type: 'item', title: 'A', tap_action: TAP }],
  ...extra,
});

/** A hass with two people (so two users), zones and a few entities. */
const HASS = {
  user: { id: 'u1' },
  states: {
    'person.cron': { state: 'home', attributes: { user_id: 'u1', friendly_name: 'Cron' } },
    'person.sam': { state: 'Work', attributes: { user_id: 'u2', friendly_name: 'Sam' } },
    'zone.home': { state: '2', attributes: { friendly_name: 'Home' } },
    'zone.work': { state: '1', attributes: { friendly_name: 'Work' } },
    'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen', brightness: 9 } },
  },
};

const mount = async (config: DashboardSidebarConfig): Promise<DashboardSidebarEditor> => {
  const el = await fixture<DashboardSidebarEditor>(
    html`<dashboard-sidebar-editor></dashboard-sidebar-editor>`,
  );
  el.hass = HASS as never;
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

/** Opens a tab by its label. */
const openTab = async (el: DashboardSidebarEditor, label: string): Promise<void> => {
  (
    [...root(el).querySelectorAll('.tab')].find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement
  ).click();
  await el.updateComplete;
};

/** Mounts and opens the Visibility tab. */
const mountTab = async (config: DashboardSidebarConfig): Promise<DashboardSidebarEditor> => {
  const el = await mount(config);
  await openTab(el, 'Visibility');
  return el;
};

/** Clicks a button by its text, optionally within a container. */
const clickText = async (
  el: DashboardSidebarEditor,
  text: string,
  within: ParentNode = root(el),
): Promise<void> => {
  const btn = [...within.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement;
  expect(btn, `button "${text}"`).to.exist;
  btn.click();
  await el.updateComplete;
};

/** Adds a condition of a type through the first add trigger with this label. */
const addType = async (
  el: DashboardSidebarEditor,
  type: string,
  trigger = 'Add Condition',
): Promise<void> => {
  await clickText(el, trigger);
  await clickText(el, type, root(el).querySelector('.add-menu') as HTMLElement);
};

/** The field (label or div) whose label span reads `label`. */
const field = (el: DashboardSidebarEditor, label: string): HTMLElement => {
  const f = [...root(el).querySelectorAll('.editor .field')].find(
    (l) => l.querySelector(':scope > span, .check-label > span')?.textContent?.trim() === label,
  ) as HTMLElement;
  expect(f, `field "${label}"`).to.exist;
  return f;
};

const typeInto = async (
  el: DashboardSidebarEditor,
  label: string,
  value: string,
): Promise<void> => {
  const input = field(el, label).querySelector('input, textarea') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('change'));
  await el.updateComplete;
};

const choose = async (el: DashboardSidebarEditor, label: string, value: string): Promise<void> => {
  const select = field(el, label).querySelector('select') as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
  await el.updateComplete;
};

const tick = async (el: DashboardSidebarEditor, label: string, option: string): Promise<void> => {
  const box = [...field(el, label).querySelectorAll('.vis-choice')]
    .find((c) => c.textContent?.trim() === option)
    ?.querySelector('input') as HTMLInputElement;
  expect(box, `choice "${option}"`).to.exist;
  box.click();
  await el.updateComplete;
};

const rows = (el: DashboardSidebarEditor): HTMLElement[] =>
  [...root(el).querySelectorAll('.vis-row')] as HTMLElement[];

const formTitle = (el: DashboardSidebarEditor): string =>
  root(el).querySelector('.editor .form-title')?.textContent?.trim() ?? '';

describe('<dashboard-sidebar-editor> Visibility tab (#4)', () => {
  it('sits right after Settings, and Settings no longer has a Visibility field', async () => {
    const el = await mount(cfg());
    const tabs = [...root(el).querySelectorAll('.tab')].map((t) => t.textContent?.trim());
    expect(tabs.slice(0, 3)).to.deep.equal(['Settings', 'Visibility', 'Header']);
    expect(root(el).querySelector('ha-card-conditions-editor, .visibility-field')).to.equal(null);
  });

  it('starts empty with our solid add button and a short note', async () => {
    const el = await mountTab(cfg());
    expect(root(el).querySelector('.tab-note')?.textContent?.trim()).to.equal(
      'Show the sidebar only when all of these hold. While editing, it always shows.',
    );
    const add = root(el).querySelector('.empty-state button.add') as HTMLElement;
    expect(add.textContent?.trim()).to.equal('Add Condition');
    expect(add.classList.contains('solid'), 'solid, like Add Element and Add Button').to.equal(
      true,
    );
    for (const b of root(el).querySelectorAll('.vis-add-row button')) {
      expect(b.classList.contains('solid')).to.equal(true);
    }
  });

  it('offers every Home Assistant condition type, grouped', async () => {
    const el = await mountTab(cfg());
    await clickText(el, 'Add Condition');
    const menu = root(el).querySelector('.add-menu')!;
    expect([...menu.querySelectorAll('.add-menu-header')].length).to.equal(5);
    expect(
      [...menu.querySelectorAll('.add-menu-item')].map((b) => b.textContent?.trim()).sort(),
    ).to.deep.equal([
      'And',
      'Device',
      'Location',
      'Not',
      'Numeric State',
      'Or',
      'Screen',
      'State',
      'Sun',
      'Template',
      'Time',
      'User',
      'Zone',
    ]);
  });

  it('has a form for every type', async () => {
    for (const type of [
      'User',
      'Screen',
      'Time',
      'Location',
      'State',
      'Numeric State',
      'Template',
      'Sun',
      'Zone',
      'Device',
      'And',
      'Or',
      'Not',
    ]) {
      const el = await mountTab(cfg());
      await addType(el, type);
      expect(formTitle(el), type).to.equal(`Condition: ${type}`);
      expect(rows(el)[0].classList.contains('selected'), `${type} selected`).to.equal(true);
      expect(root(el).querySelector('.editor .yaml-mode'), `${type} has a UI form`).to.equal(null);
    }
  });

  it('builds a state condition from its fields', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'State');
    await typeInto(el, 'Entity', 'light.kitchen');
    await typeInto(el, 'States', 'on, idle');
    expect(save(el)?.visibility).to.deep.equal([
      { condition: 'state', entity: 'light.kitchen', state: ['on', 'idle'] },
    ]);
    await choose(el, 'Match', 'not');
    await choose(el, 'Attribute', 'brightness');
    expect(save(el)?.visibility).to.deep.equal([
      {
        condition: 'state',
        entity: 'light.kitchen',
        state_not: ['on', 'idle'],
        attribute: 'brightness',
      },
    ]);
  });

  it('moves a state check to the entity_id form when it needs a duration', async () => {
    const el = await mountTab(
      cfg({ visibility: [{ condition: 'state', entity: 'light.kitchen', state: 'on' }] }),
    );
    rows(el)[0].click();
    await el.updateComplete;
    await typeInto(el, 'For At Least', '00:05:00');
    expect(save(el)?.visibility).to.deep.equal([
      { condition: 'state', entity_id: 'light.kitchen', state: 'on', for: '00:05:00' },
    ]);
  });

  it('picks users by name and stores their ids', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'User');
    await tick(el, 'Users', 'Sam');
    expect(save(el)?.visibility).to.deep.equal([{ condition: 'user', users: ['u2'] }]);
    expect(rows(el)[0].querySelector('.vis-summary')?.textContent).to.equal('Sam');
  });

  it('builds screen queries the way Home Assistant does, or takes a custom one', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'Screen');
    await tick(el, 'Sizes', 'Desktop (1024px+)');
    await tick(el, 'Sizes', 'Wide (1280px+)');
    expect(save(el)?.visibility?.[0]).to.deep.equal({
      condition: 'screen',
      media_query: '(min-width: 1024px)',
    });
    await tick(el, 'Sizes', 'Desktop (1024px+)');
    await tick(el, 'Sizes', 'Wide (1280px+)');
    await tick(el, 'Sizes', 'Mobile (0px+)');
    expect(save(el)?.visibility?.[0]).to.deep.equal({
      condition: 'screen',
      media_query: '(max-width: 767px)',
    });
    await choose(el, 'Match', 'custom');
    await typeInto(el, 'Media Query', '(orientation: portrait)');
    expect(save(el)?.visibility?.[0]).to.deep.equal({
      condition: 'screen',
      media_query: '(orientation: portrait)',
    });
  });

  it('sets a time window and days', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'Time');
    await typeInto(el, 'After', '22:00:00');
    await typeInto(el, 'Before', '06:00:00');
    await tick(el, 'Days', 'Fri');
    await tick(el, 'Days', 'Mon');
    expect(save(el)?.visibility?.[0]).to.deep.equal({
      condition: 'time',
      after: '22:00:00',
      before: '06:00:00',
      weekdays: ['mon', 'fri'],
    });
  });

  it('checks a location by place or by zones', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'Location');
    await tick(el, 'Places', 'Work');
    expect(save(el)?.visibility?.[0]).to.deep.equal({ condition: 'location', locations: ['Work'] });
    await choose(el, 'Check', 'zones');
    await tick(el, 'Zones', 'Home');
    await choose(el, 'Match', 'active_zone');
    expect(save(el)?.visibility?.[0]).to.deep.equal({
      condition: 'location',
      target: { entity_id: ['zone.home'] },
      match_mode: 'active_zone',
    });
  });

  it('nests conditions inside a group, under a guide line', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'Or');
    await addType(el, 'User', 'Add Inside');
    const saved = save(el)?.visibility;
    expect(saved).to.deep.equal([
      { condition: 'or', conditions: [{ condition: 'user', users: [] }] },
    ]);
    expect(root(el).querySelector('.vis-children .vis-row'), 'child row').to.exist;
    expect(formTitle(el)).to.equal('Condition: User');
  });

  it('adds after, moves, and deletes', async () => {
    const el = await mountTab(cfg({ visibility: [{ condition: 'user', users: ['u1'] }] }));
    rows(el)[0].click();
    await el.updateComplete;
    await addType(el, 'Or', 'Add After');
    expect(save(el)?.visibility?.map((c) => c.condition)).to.deep.equal(['user', 'or']);
    (root(el).querySelector('.form-tools [title="Move up"]') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(save(el)?.visibility?.map((c) => c.condition)).to.deep.equal(['or', 'user']);
    await clickText(el, 'Delete Or');
    expect(el.visibilityConditions.map((c) => c.condition)).to.deep.equal(['user']);
    rows(el)[0].click();
    await el.updateComplete;
    await clickText(el, 'Delete User');
    expect(save(el)?.visibility, 'none left: key removed').to.equal(undefined);
  });

  it('offers only Turn Off / Turn On per condition, with YAML on the tab menu alone', async () => {
    const el = await mountTab(cfg({ visibility: [{ condition: 'user', users: ['u1'] }] }));
    rows(el)[0].click();
    await el.updateComplete;
    (root(el).querySelector('.form-tools [title="More"]') as HTMLButtonElement).click();
    await el.updateComplete;
    const items = [...root(el).querySelectorAll('.add-menu .add-menu-item')].map((b) =>
      b.textContent?.trim(),
    );
    expect(items).to.deep.equal(['Turn Off']);
  });

  it('turns a condition off and on', async () => {
    const el = await mountTab(cfg({ visibility: [{ condition: 'user', users: ['u1'] }] }));
    rows(el)[0].click();
    await el.updateComplete;
    (root(el).querySelector('.form-tools [title="More"]') as HTMLButtonElement).click();
    await el.updateComplete;
    await clickText(el, 'Turn Off');
    expect(save(el)?.visibility?.[0].enabled).to.equal(false);
    expect(rows(el)[0].classList.contains('off')).to.equal(true);
    (root(el).querySelector('.form-tools [title="More"]') as HTMLButtonElement).click();
    await el.updateComplete;
    await clickText(el, 'Turn On');
    expect(rows(el)[0].classList.contains('off')).to.equal(false);
    // back as it was: nothing to save, and no enabled key left behind
    expect(el.visibilityConditions[0]).to.not.have.property('enabled');
  });

  it('edits the whole list as YAML from the tab menu', async () => {
    const el = await mountTab(cfg({ visibility: [{ condition: 'user', users: ['u1'] }] }));
    (root(el).querySelector('.tab-notes .tool') as HTMLButtonElement).click();
    await el.updateComplete;
    await clickText(el, 'Edit As YAML');
    const area = root(el).querySelector('.editor textarea') as HTMLTextAreaElement;
    expect(JSON.parse(area.value)).to.deep.equal([{ condition: 'user', users: ['u1'] }]);
    area.value = JSON.stringify([{ condition: 'sun', after: 'sunset' }]);
    area.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(save(el)?.visibility).to.deep.equal([{ condition: 'sun', after: 'sunset' }]);
  });

  it('keeps an integration condition, pointing to the tab YAML to edit it', async () => {
    const odd = { condition: 'some_integration.thing', option: 1 };
    const el = await mountTab(cfg({ visibility: [odd] }));
    rows(el)[0].click();
    await el.updateComplete;
    expect(root(el).querySelector('.editor textarea'), 'no per-condition YAML').to.equal(null);
    expect(
      root(el).querySelector('.editor .form > .field-desc')?.textContent?.replace(/\s+/g, ' '),
    ).to.contain("Edit it with the tab's Edit As YAML");
    expect(formTitle(el)).to.equal('Condition: Some integration thing');
    expect(el.visibilityConditions).to.deep.equal([odd]);
  });

  it('shows the live result for you, per row and overall', async () => {
    const el = await mountTab(
      cfg({
        visibility: [
          { condition: 'user', users: ['u1'] },
          { condition: 'state', entity: 'light.kitchen', state: 'off' },
          { condition: 'template', value_template: '{{ true }}' },
        ],
      }),
    );
    const status = rows(el).map((r) => r.querySelector('.vis-status')?.className);
    expect(status[0]).to.contain('yes');
    expect(status[1]).to.contain('no');
    expect(status[2], 'checked by Home Assistant').to.contain('server');
    expect(root(el).querySelector('.vis-live')?.textContent?.trim()).to.equal(
      'Hidden from you now',
    );
  });

  it('shows what a condition still needs', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'State');
    const errors = [...root(el).querySelectorAll('.vis-errors .field-error')].map((e) =>
      e.textContent?.trim(),
    );
    expect(errors).to.include('Entity: needs an entity id');
  });

  it('keeps hints under fields in the standard hint style', async () => {
    const el = await mountTab(cfg());
    await addType(el, 'Time');
    const hint = field(el, 'After').querySelector(':scope > small.field-desc');
    expect(hint?.textContent?.trim()).to.equal('From this time on. Empty means from midnight.');
  });
});
