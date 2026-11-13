import { expect, fixture, html } from '@open-wc/testing';
import {
  getSnapshot,
  getSnapshotConfig,
  saveSnapshot,
  setViewport,
} from '@web/test-runner-commands';

import { ALL_CASES, NOW, WORLD } from '../lib/visibility.cases';
import { clock } from '../lib/visibility';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

// UI snapshots of the Visibility tab for every case in visibility.cases.ts:
// each row (type, summary, live status and its tooltip) and, for each row
// selected in turn, its form (every field's label, value, state, error and
// hint, and the buttons). Rendered by the real editor at the fixed moment,
// with Home Assistant never answering, so server rows show the first guess or
// wait. Snapshots live in __snapshots__/; refresh deliberately with
//   npx web-test-runner src/editor/visibility-tab.snapshot.browser.test.ts --update-snapshots

before(async () => {
  clock.now = () => new Date(NOW);
  await setViewport({ width: 1200, height: 900 });
});

/** A connection that takes subscriptions and never answers. */
const silent = {
  subscribeMessage: () => Promise.resolve(() => undefined),
};

const text = (el: Element | null | undefined): string =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** One field, as a line: label, value or choices, state, error, hint. */
const fieldLine = (f: Element): string => {
  const label = text(f.querySelector(':scope > span, .check-label > span'));
  const parts: string[] = [];
  const selects = [...f.querySelectorAll('select')];
  if (selects.length) {
    parts.push(
      selects
        .map(
          (s) =>
            `${s.selectedOptions[0]?.textContent?.trim() ?? ''}${s.disabled ? ' (disabled)' : ''}`,
        )
        .join(' : '),
    );
  }
  const choices = [...f.querySelectorAll('.vis-choice')];
  if (choices.length) {
    parts.push(
      choices
        .map(
          (c) =>
            `${(c.querySelector('input') as HTMLInputElement).checked ? '[x]' : '[ ]'} ${text(c)}`,
        )
        .join(', '),
    );
  }
  const input = f.querySelector(':scope > input, input[type="text"]') as HTMLInputElement | null;
  if (input && !choices.length) parts.push(`"${input.value}"`);
  const check = f.matches('.field-inline')
    ? (f.querySelector('input[type="checkbox"]') as HTMLInputElement)
    : null;
  if (check) parts.push(check.checked ? '[x]' : '[ ]');
  const picked = f.querySelector('.field-picked-id');
  if (picked) parts.push(`picked ${text(picked)}`);
  const area = f.querySelector('textarea, ha-code-editor');
  if (area) parts.push(`code "${(area as HTMLTextAreaElement).value ?? ''}"`);
  const error = f.querySelector('.field-error');
  if (error) parts.push(`ERROR ${text(error)}`);
  const hint = f.querySelector('.field-desc');
  if (hint) parts.push(`hint: ${text(hint)}`);
  return `    ${label}: ${parts.join(' | ')}`;
};

/** The tab as text: the rows, then each row's form. */
const describeTab = async (el: DashboardSidebarEditor): Promise<string> => {
  const root = el.shadowRoot!;
  const lines: string[] = [];
  const rows = [...root.querySelectorAll('.vis-row')] as HTMLElement[];
  for (const row of rows) {
    let depth = 0;
    for (let p = row.parentElement; p; p = p.parentElement) {
      if (p.classList.contains('vis-children')) depth += 1;
    }
    const status = row.querySelector('.vis-status');
    const state = status
      ? `${[...status.classList].filter((c) => c !== 'vis-status').join(' ')} "${status.getAttribute('title') ?? text(status)}"`
      : 'none';
    lines.push(
      `${'  '.repeat(depth)}- ${text(row.querySelector('.vis-type'))}: ${text(row.querySelector('.vis-summary'))}${row.classList.contains('off') ? ' (off)' : ''} -> ${state}`,
    );
  }
  for (const [i, row] of rows.entries()) {
    row.click();
    await el.updateComplete;
    const form = root.querySelector('.editor .form');
    lines.push(`row ${i + 1}: ${text(form?.querySelector('.form-title'))}`);
    for (const note of form?.querySelectorAll(':scope > .field-desc') ?? []) {
      lines.push(`    note: ${text(note)}`);
    }
    for (const f of form?.querySelectorAll(':scope > .field, :scope > * > .field') ?? []) {
      lines.push(fieldLine(f));
    }
    const tools = [...(form?.querySelectorAll('.form-tools .tool') ?? [])].map(
      (t) => `${t.getAttribute('title')}${(t as HTMLButtonElement).disabled ? ' (disabled)' : ''}`,
    );
    lines.push(`    tools: ${tools.join(', ')}`);
    lines.push(
      `    actions: ${[...(form?.querySelectorAll('.form-actions button') ?? [])].map(text).join(', ')}`,
    );
  }
  return lines.join('\n');
};

/** Compares with the stored snapshot, or stores it (first run, or --update-snapshots). */
const matchSnapshot = async (name: string, content: string): Promise<void> => {
  const { updateSnapshots } = await getSnapshotConfig();
  const stored = await getSnapshot({ name });
  if (stored === undefined || updateSnapshots) {
    await saveSnapshot({ name, content });
    return;
  }
  expect(content, name).to.equal(stored);
};

describe('Visibility tab UI snapshots', () => {
  for (const c of ALL_CASES) {
    it(c.name, async () => {
      const el = await fixture<DashboardSidebarEditor>(
        html`<dashboard-sidebar-editor></dashboard-sidebar-editor>`,
      );
      el.hass = { ...WORLD, connection: silent } as never;
      el.config = {
        body: [{ type: 'item', title: 'A', tap_action: { action: 'none' } }],
        visibility: c.conditions,
      };
      await el.updateComplete;
      (
        [...el.shadowRoot!.querySelectorAll('.tab')].find(
          (b) => b.textContent?.trim() === 'Visibility',
        ) as HTMLButtonElement
      ).click();
      await el.updateComplete;
      await el.updateComplete;
      await matchSnapshot(c.name, await describeTab(el));
    });
  }
});
