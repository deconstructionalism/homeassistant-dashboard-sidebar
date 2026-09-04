import { aTimeout, expect, fixture, html } from '@open-wc/testing';
import { sendMouse } from '@web/test-runner-commands';
import type { DashboardSidebarConfig } from '../lib/types';
import type { DashboardSidebarEditor } from './sidebar-editor';
import './sidebar-editor';

const TAP = { action: 'toggle' } as const;

describe('preview resize stability', () => {
  it('drags the width handle to the minimum fast without observer loops', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      type: 'item' as const,
      title: `I${i}`,
      icon: 'mdi:circle',
      tap_action: TAP,
    }));
    const config: DashboardSidebarConfig = {
      body: many,
      mobile: { items: many.map((m) => ({ ...m })) },
    };
    const el = await fixture<DashboardSidebarEditor>(
      html`<dashboard-sidebar-editor></dashboard-sidebar-editor>`,
    );
    el.config = config;
    await el.updateComplete;
    const root = el.shadowRoot as ShadowRoot;
    (
      [...root.querySelectorAll('.tab')].find(
        (b) => b.textContent?.trim() === 'Mobile Bar',
      ) as HTMLButtonElement
    ).click();
    await el.updateComplete;
    await aTimeout(80);
    const handle = root.querySelector('.mobile-pv-handle') as HTMLElement;
    handle.scrollIntoView({ block: 'center' });
    await aTimeout(60);
    const h = handle.getBoundingClientRect();
    const hx = Math.round(h.x + 8);
    const hy = Math.round(h.y + 60);
    await sendMouse({ type: 'move', position: [hx, hy] });
    await sendMouse({ type: 'down' });
    for (let i = 0; i < 12; i++) {
      await sendMouse({ type: 'move', position: [Math.max(4, hx - i * 60), hy] });
      await aTimeout(20);
    }
    for (let i = 0; i < 20; i++) {
      await sendMouse({ type: 'move', position: [4 + (i % 3) * 6, hy] });
      await aTimeout(10);
    }
    await sendMouse({ type: 'up' });
    await aTimeout(300);
    const caption = root.querySelector('.mobile-pv-caption');
    console.log('survived; caption:', caption?.textContent?.trim());
    expect(caption).to.exist;
  });
});
