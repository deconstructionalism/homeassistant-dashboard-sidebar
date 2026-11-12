import { describe, expect, it } from 'vitest';

import { sidebarVisible, starterConfig, wrapperCss } from './bootstrap';
import { validateConfig } from './validate';

const hass = {
  user: { name: 'Sam' },
  states: {
    'light.a': { attributes: { friendly_name: 'Lamp A' } },
    'light.b': {},
    'switch.x': {},
  },
};

const lovelace = {
  config: {
    views: [
      { title: 'Home', path: 'home', icon: 'mdi:home' },
      { title: 'Devices', path: 'devices', icon: 'mdi:devices' },
      { title: 'Hidden', path: 'hidden', subview: true },
    ],
  },
};

describe('starterConfig', () => {
  it('builds a valid config', () => {
    expect(validateConfig(starterConfig(hass, lovelace))).toHaveLength(0);
  });

  it('seeds a centered clock, date, and greeting in the header', () => {
    const cfg = starterConfig(hass, lovelace);
    expect(cfg.header?.map((b) => b.type)).toEqual(['clock', 'date', 'title']);
    expect(cfg.header?.[0]).toMatchObject({ type: 'clock', align: 'center' });
    expect(cfg.header?.[2]).toMatchObject({ type: 'title', text: 'Hello Sam' });
  });

  it('adds one navigate link per non-subview, using its icon', () => {
    const cfg = starterConfig(hass, lovelace);
    // The subview is excluded.
    expect(cfg.body).toHaveLength(2);
    expect(cfg.body?.[0]).toMatchObject({
      type: 'item',
      icon: 'mdi:home',
      tap_action: { action: 'navigate', navigation_path: '/lovelace/home' },
    });
  });

  it('adds the instance lights as footer toggle buttons', () => {
    const cfg = starterConfig(hass, lovelace);
    expect(cfg.footer?.buttons).toHaveLength(2);
    expect(cfg.footer?.buttons?.[0]).toMatchObject({
      entity: 'light.a',
      tap_action: { action: 'toggle', entity: 'light.a' },
    });
  });

  it('omits body and footer when there are no views or lights', () => {
    const cfg = starterConfig({ states: {} }, { config: { views: [] } });
    expect(cfg.body).toBeUndefined();
    expect(cfg.footer).toBeUndefined();
    expect(validateConfig(cfg)).toHaveLength(0);
  });
});

describe('wrapperCss (the dashboard layout around the sidebar)', () => {
  const body = [{ type: 'item' as const, title: 'A', tap_action: { action: 'none' as const } }];

  it('slides the dashboard by default', () => {
    expect(wrapperCss({ body })).toContain('transition: width 0.25s ease');
  });

  it('does not slide with animate: false, push or overlay', () => {
    for (const overlay of [false, true]) {
      const css = wrapperCss({ body, animate: false, overlay });
      expect(css).not.toContain('width 0.25s');
      expect(css).toContain('transition: none');
    }
  });

  it('never slides while settling in, or for reduced motion', () => {
    const css = wrapperCss({ body });
    expect(css).toMatch(/\[data-settling\][^{]*\{\s*transition: none !important;/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none !important;/,
    );
  });
});

describe('sidebarVisible', () => {
  const body = [{ type: 'item' as const, title: 'A', tap_action: { action: 'none' as const } }];
  const hass = { user: { id: 'u1' }, states: { 'input_boolean.kiosk': { state: 'on' } } };

  it('shows with no visibility conditions', () => {
    expect(sidebarVisible({ body }, hass, false)).toBe(true);
  });

  it('follows the conditions for the current user and states', () => {
    expect(
      sidebarVisible({ body, visibility: [{ condition: 'user', users: ['u1'] }] }, hass, false),
    ).toBe(true);
    expect(
      sidebarVisible({ body, visibility: [{ condition: 'user', users: ['u2'] }] }, hass, false),
    ).toBe(false);
    expect(
      sidebarVisible(
        { body, visibility: [{ condition: 'state', entity: 'input_boolean.kiosk', state: 'off' }] },
        hass,
        false,
      ),
    ).toBe(false);
  });

  it('always shows while the dashboard is being edited', () => {
    expect(
      sidebarVisible({ body, visibility: [{ condition: 'user', users: ['u2'] }] }, hass, true),
    ).toBe(true);
  });
});
