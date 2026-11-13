import { expect } from '@open-wc/testing';

import {
  STYLING_ENGINES,
  applyStyles,
  scopeCss,
  styleConfig,
  stylingEngine,
  stylingInstalled,
  whenStylingEngine,
} from './styling';

// The custom element registry is global to this test page and can't be
// unregistered, so the suites below run in order through the real lifecycle:
// nothing installed, then card-mod alone, then UIX added alongside it.
// (UIX alone has its own page: styling-uix-only.browser.test.ts.)

/** A stand-in styling engine element recording applyToElement calls. */
const makeStub = () =>
  class StubEngine extends HTMLElement {
    /** Recorded calls, inspected by the tests. */
    static calls: Array<{ element: HTMLElement; type: string; config: unknown }> = [];
    /** When true, applyToElement throws to exercise the failure path. */
    static shouldThrow = false;

    /** Records the arguments, or throws when shouldThrow is set. */
    static applyToElement(element: HTMLElement, type: string, config: unknown): void {
      if (StubEngine.shouldThrow) {
        throw new Error('boom');
      }
      StubEngine.calls.push({ element, type, config });
    }
  };

const StubCardMod = makeStub();
const StubUix = makeStub();

const reset = (): void => {
  StubCardMod.calls = [];
  StubCardMod.shouldThrow = false;
  StubUix.calls = [];
  StubUix.shouldThrow = false;
};

describe('styleConfig', () => {
  it('prefers uix over card_mod, as UIX itself does', () => {
    expect(styleConfig({ uix: { style: 'a' }, card_mod: { style: 'b' } })).to.deep.equal({
      style: 'a',
    });
  });

  it('falls back to card_mod when there is no uix', () => {
    expect(styleConfig({ card_mod: { style: 'b' } })).to.deep.equal({ style: 'b' });
  });

  it('is undefined when neither key is set, or there is no holder', () => {
    expect(styleConfig({})).to.equal(undefined);
    expect(styleConfig(undefined)).to.equal(undefined);
  });
});

describe('styling engines', () => {
  it('lists UIX before card-mod', () => {
    expect([...STYLING_ENGINES]).to.deep.equal(['uix-node', 'card-mod']);
  });
});

describe('with no styling engine installed', () => {
  it('reports none and applies nothing', () => {
    expect(stylingEngine()).to.equal(null);
    expect(stylingInstalled()).to.equal(false);
    expect(applyStyles(document.createElement('div'), { style: 'x' })).to.equal(null);
  });
});

describe('when card-mod loads after the page', () => {
  it('whenStylingEngine resolves once it is defined', async () => {
    const waiting = whenStylingEngine();
    customElements.define('card-mod', StubCardMod);
    expect(await waiting).to.equal('card-mod');
  });
});

describe('with only card-mod installed', () => {
  beforeEach(reset);

  it('reports card-mod as the engine', () => {
    expect(stylingEngine()).to.equal('card-mod');
    expect(stylingInstalled()).to.equal(true);
  });

  it('delegates to card-mod and names it', () => {
    const host = document.createElement('div');
    const config = { style: '.x { color: red }' };
    expect(applyStyles(host, config, 'my-type')).to.equal('card-mod');
    expect(StubCardMod.calls).to.have.length(1);
    expect(StubCardMod.calls[0].element).to.equal(host);
    expect(StubCardMod.calls[0].type).to.equal('my-type');
    expect(StubCardMod.calls[0].config).to.equal(config);
  });

  it('defaults the type to dashboard-sidebar', () => {
    applyStyles(document.createElement('div'), {});
    expect(StubCardMod.calls[0].type).to.equal('dashboard-sidebar');
  });

  it('swallows a card-mod failure and returns null', () => {
    StubCardMod.shouldThrow = true;
    expect(applyStyles(document.createElement('div'), {})).to.equal(null);
  });
});

describe('with UIX installed alongside card-mod', () => {
  before(() => {
    customElements.define('uix-node', StubUix);
  });

  beforeEach(reset);

  it('prefers UIX', () => {
    expect(stylingEngine()).to.equal('uix-node');
  });

  it('applies through UIX only, never both', () => {
    const host = document.createElement('div');
    const config = { style: '.x { color: red }' };
    expect(applyStyles(host, config, 'my-type')).to.equal('uix-node');
    expect(StubUix.calls).to.have.length(1);
    expect(StubUix.calls[0]).to.deep.equal({ element: host, type: 'my-type', config });
    expect(StubCardMod.calls).to.have.length(0);
  });

  it('hands a card_mod-keyed config to UIX too (key and engine are independent)', () => {
    const holder = { card_mod: { style: '.legacy { color: red }' } };
    applyStyles(document.createElement('div'), styleConfig(holder));
    expect(StubUix.calls[0].config).to.deep.equal(holder.card_mod);
  });

  it('falls back to card-mod when UIX throws', () => {
    StubUix.shouldThrow = true;
    const host = document.createElement('div');
    expect(applyStyles(host, { style: 'x' })).to.equal('card-mod');
    expect(StubCardMod.calls).to.have.length(1);
    expect(StubCardMod.calls[0].element).to.equal(host);
  });

  it('returns null when every installed engine throws', () => {
    StubUix.shouldThrow = true;
    StubCardMod.shouldThrow = true;
    expect(applyStyles(document.createElement('div'), {})).to.equal(null);
  });

  it('whenStylingEngine resolves at once when an engine is already defined', async () => {
    expect(['uix-node', 'card-mod']).to.include(await whenStylingEngine());
  });
});

describe('scopeCss', () => {
  it('scopes each rule to the host element and its descendants', () => {
    const out = scopeCss('.a { color: red; }', '[data-loc="header:0"]');
    expect(out).to.contain('[data-loc="header:0"]:is(.a)');
    expect(out).to.contain('[data-loc="header:0"] :is(.a)');
  });

  it('recurses into grouping at-rules', () => {
    const out = scopeCss('@media (min-width: 1px) { .a { color: red; } }', '[data-loc="x"]') ?? '';
    expect(out).to.contain('@media');
    expect(out).to.contain('[data-loc="x"]:is(.a)');
  });

  it('scopes a :host selector too', () => {
    const out = scopeCss(':host { border: 1px; }', '[data-loc="x"]') ?? '';
    expect(out).to.contain('[data-loc="x"]:is(:host)');
  });
});
