import { describe, expect, it } from 'vitest';

import { runAction } from './action';
import type { HomeAssistant } from 'custom-card-helpers';

/** A fake hass that records callService invocations. */
const fakeHass = (): {
  hass: HomeAssistant;
  calls: Array<{ domain: string; service: string; data?: unknown; target?: unknown }>;
} => {
  const calls: Array<{ domain: string; service: string; data?: unknown; target?: unknown }> = [];
  const hass = {
    states: {
      'light.a': { state: 'off' },
      'switch.b': { state: 'on' },
      'lock.door': { state: 'locked' },
    },
    callService: (domain: string, service: string, data?: unknown, target?: unknown) => {
      calls.push({ domain, service, data, target });
      return Promise.resolve();
    },
  } as unknown as HomeAssistant;
  return { hass, calls };
};

const NODE = {} as unknown as HTMLElement;

describe('runAction', () => {
  it('does nothing for none or an absent action', () => {
    const { hass, calls } = fakeHass();
    runAction(NODE, hass, undefined, 'light.a');
    runAction(NODE, hass, { action: 'none' }, 'light.a');
    expect(calls).toHaveLength(0);
  });

  it('toggles the element entity with the right domain service', () => {
    const { hass, calls } = fakeHass();
    runAction(NODE, hass, { action: 'toggle' }, 'light.a');
    // light.a is off, so it turns on.
    expect(calls[0]).toMatchObject({ domain: 'light', service: 'turn_on' });
  });

  it('uses lock/unlock for a lock rather than a plain toggle', () => {
    const { hass, calls } = fakeHass();
    runAction(NODE, hass, { action: 'toggle' }, 'lock.door');
    // lock.door is locked, so it unlocks.
    expect(calls[0]).toMatchObject({ domain: 'lock', service: 'unlock' });
  });

  it("prefers the action's own entity over the element entity", () => {
    const { hass, calls } = fakeHass();
    runAction(NODE, hass, { action: 'toggle', entity: 'switch.b' }, 'light.a');
    // switch.b is on, so it turns off.
    expect(calls[0]).toMatchObject({ domain: 'switch', service: 'turn_off' });
  });

  it('calls a service with modern data and target', () => {
    const { hass, calls } = fakeHass();
    runAction(
      NODE,
      hass,
      {
        action: 'call-service',
        service: 'light.turn_on',
        entity: 'light.c',
        data: { brightness: 5 },
      },
      undefined,
    );
    expect(calls[0]).toEqual({
      domain: 'light',
      service: 'turn_on',
      data: { brightness: 5 },
      target: { entity_id: 'light.c' },
    });
  });

  it('skips a call-service action with no service', () => {
    const { hass, calls } = fakeHass();
    runAction(NODE, hass, { action: 'call-service' }, undefined);
    expect(calls).toHaveLength(0);
  });
});

describe('runAction assist', () => {
  it('prefers the companion app message when it advertises Assist', () => {
    const sent: unknown[] = [];
    const hass = {
      states: {},
      auth: {
        external: { config: { hasAssist: true }, fireMessage: (m: unknown) => sent.push(m) },
      },
    } as unknown as HomeAssistant;
    runAction(NODE, hass, { action: 'assist', start_listening: true });
    expect(sent[0]).toMatchObject({
      type: 'assist/show',
      payload: { start_listening: true },
    });
  });

  it('falls back to the voice dialog event in a browser', () => {
    const seen: Array<Event & { type: string; detail?: Record<string, unknown> }> = [];
    const node = {
      dispatchEvent: (ev: Event) => {
        seen.push(ev as never);
        return true;
      },
    } as unknown as HTMLElement;
    runAction(node, { states: {} } as unknown as HomeAssistant, { action: 'assist' });
    expect(seen[0]?.type).toBe('show-dialog');
    const detail = seen[0]?.detail as {
      dialogTag?: string;
      dialogParams?: { start_listening?: boolean };
    };
    expect(detail?.dialogTag).toBe('ha-voice-command-dialog');
    expect(detail?.dialogParams?.start_listening).toBe(false);
  });
});
