import { expect } from '@open-wc/testing';

import { applyStyles, styleConfig, stylingEngine, stylingInstalled } from './styling';

// Its own page: UIX installed and card-mod not, which is what UIX's own
// migration steps leave you with (they say to uninstall card-mod). Before
// UIX support, this setup silently dropped every sidebar style.

/** A stand-in for UIX's `uix-node` element, recording applyToElement calls. */
class StubUix extends HTMLElement {
  /** Recorded calls, inspected by the tests. */
  static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];
  /** When true, applyToElement throws to exercise the failure path. */
  static shouldThrow = false;

  /** Records the arguments, or throws when shouldThrow is set. */
  static applyToElement(element: HTMLElement, type: string, config: unknown): void {
    if (StubUix.shouldThrow) {
      throw new Error('boom');
    }
    StubUix.calls.push({ element, type, config });
  }
}

/** An element registered as `card-mod` that has no apply surface at all. */
class NotAnEngine extends HTMLElement {}

describe('with only UIX installed', () => {
  before(() => {
    customElements.define('uix-node', StubUix);
  });

  beforeEach(() => {
    StubUix.calls = [];
    StubUix.shouldThrow = false;
  });

  it('reports UIX as the engine', () => {
    expect(stylingEngine()).to.equal('uix-node');
    expect(stylingInstalled()).to.equal(true);
  });

  it('applies a uix config through UIX', () => {
    const host = document.createElement('div');
    const config = { style: ':host { color: red }' };
    expect(applyStyles(host, styleConfig({ uix: config }), 'dashboard-sidebar')).to.equal(
      'uix-node',
    );
    expect(StubUix.calls).to.deep.equal([{ element: host, type: 'dashboard-sidebar', config }]);
  });

  it('still applies a legacy card_mod config, through UIX', () => {
    const config = { style: ':host { color: blue }' };
    applyStyles(document.createElement('div'), styleConfig({ card_mod: config }));
    expect(StubUix.calls[0].config).to.equal(config);
  });

  it('returns null when UIX throws and there is nothing to fall back to', () => {
    StubUix.shouldThrow = true;
    expect(applyStyles(document.createElement('div'), {})).to.equal(null);
  });
});

describe('with a "card-mod" element that is not really an engine', () => {
  before(() => {
    customElements.define('card-mod', NotAnEngine);
  });

  beforeEach(() => {
    StubUix.calls = [];
    StubUix.shouldThrow = false;
  });

  it('still prefers UIX', () => {
    expect(stylingEngine()).to.equal('uix-node');
  });

  it('skips it as a fallback rather than calling a missing method', () => {
    StubUix.shouldThrow = true;
    expect(applyStyles(document.createElement('div'), {})).to.equal(null);
  });
});
