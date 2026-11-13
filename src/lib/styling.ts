/**
 * CSS styling through a styling engine: UIX first, card-mod as the fallback.
 *
 * UIX (https://github.com/Lint-Free-Technology/uix) is the successor to
 * card-mod and the engine this project supports first. card-mod still works
 * and will keep working until it is deprecated here. Both register a custom
 * element with the same static `applyToElement(element, type, config)`
 * surface: UIX as `uix-node`, card-mod as `card-mod`. Either engine can
 * render either config key, so the key (`uix:` or `card_mod:`) and the
 * engine installed are independent of each other.
 */

import type { Align } from './types';

/** The styling engines' custom element names, in preference order. */
export const STYLING_ENGINES = ['uix-node', 'card-mod'] as const;

/** A styling engine, named by its custom element. */
export type StylingEngine = (typeof STYLING_ENGINES)[number];

/**
 * The static apply surface a styling engine's custom element exposes. Neither
 * engine is a card, so there is no `setConfig`; this method is how a custom
 * card asks the engine to style an element it owns.
 */
interface EngineElement {
  /**
   * Renders `config` (a `{ style, class }` object) into `element`'s shadow
   * root and keeps it live against hass. The `type` tags the engine's internal
   * per-element state so repeat calls reuse one instance.
   */
  applyToElement?: (element: HTMLElement, type: string, config: unknown) => void;
}

/** The engine's element class, when it is defined and has the apply surface. */
const engineElement = (name: StylingEngine): EngineElement | undefined => {
  const el = customElements.get(name) as unknown as EngineElement | undefined;
  return typeof el?.applyToElement === 'function' ? el : undefined;
};

/**
 * The styling engine that would style an element right now: UIX when it is
 * installed, card-mod otherwise, or null when neither is.
 */
export const stylingEngine = (): StylingEngine | null =>
  STYLING_ENGINES.find((name) => engineElement(name) !== undefined) ?? null;

/** Whether any styling engine (UIX or card-mod) is installed. */
export const stylingInstalled = (): boolean => stylingEngine() !== null;

/**
 * Resolves with the first styling engine to be defined. Lets an element whose
 * first render beat the engine's own load re-apply its styles once it arrives.
 */
export const whenStylingEngine = (): Promise<StylingEngine> =>
  Promise.race(STYLING_ENGINES.map((name) => customElements.whenDefined(name).then(() => name)));

/** Anything that can carry style config: a block, a button, the sidebar, the bar. */
export interface StyleHolder {
  /** The UIX style config. Wins when both keys are set. */
  uix?: Record<string, unknown>;
  /** The card-mod style config, kept working until it is deprecated. */
  card_mod?: Record<string, unknown>;
}

/**
 * The style config an element asks for: its `uix` when set, otherwise its
 * `card_mod`. `uix` winning matches UIX's own rule for the two keys.
 */
export const styleConfig = (holder: StyleHolder | undefined): Record<string, unknown> | undefined =>
  holder?.uix ?? holder?.card_mod;

/**
 * Hands `config` to a styling engine to render into `host`'s shadow root: UIX
 * when installed, card-mod otherwise. If UIX throws and card-mod is also
 * installed, card-mod gets a turn. Returns the engine that applied the styles,
 * or null when none is installed or every installed one threw. Failures are
 * swallowed so a styling engine can never break the sidebar itself.
 */
export const applyStyles = (
  host: HTMLElement,
  config: unknown,
  type = 'dashboard-sidebar',
): StylingEngine | null => {
  for (const name of STYLING_ENGINES) {
    const engine = engineElement(name);
    if (!engine?.applyToElement) {
      continue;
    }
    try {
      // The default (omitted) trailing flags make the engine attach inside
      // the host's shadow root. `type` tags its per-element state, so a unique
      // type per element keeps their styles from colliding.
      engine.applyToElement(host, type, config);
      return name;
    } catch (err) {
      console.warn(`[dashboard-sidebar] ${name} failed:`, err);
    }
  }
  return null;
};

/**
 * Rewrites CSS so every rule matches only the element identified by `hostSel`
 * (e.g. `[data-loc="header:0"]`) or its descendants: the basis for scoping a
 * per-element style config (`uix` or `card_mod`) to just that element.
 *
 * Each rule's selector list `orig` becomes `hostSel:is(orig), hostSel :is(orig)`.
 * The first branch is the compound (self) match, so a bare class that names the
 * element itself (the title carries `.dashboard-sidebar-title`) matches, which
 * plain `@scope` can't do for its own root. The second branch matches descendant
 * targets (an item's icon, a category's chevron). Grouping rules (`@media`,
 * `@supports`) are recursed into; nested rules stay relative to their now-scoped
 * parent. Parsing goes through a constructed stylesheet so the browser's own CSS
 * engine handles comments, nesting, and at-rules. Returns null when the CSS
 * cannot be parsed (caller then applies it unscoped rather than dropping it).
 */
export const scopeCss = (css: string, hostSel: string): string | null => {
  let sheet: CSSStyleSheet;
  try {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
  } catch {
    return null;
  }
  const rewrite = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const orig = rule.selectorText;
        // Scope this rule; leave any nested rules relative to the scoped parent.
        rule.selectorText = `${hostSel}:is(${orig}), ${hostSel} :is(${orig})`;
      } else {
        const grouping = rule as CSSRule & { cssRules?: CSSRuleList };
        if (grouping.cssRules) {
          rewrite(grouping.cssRules);
        }
      }
    }
  };
  rewrite(sheet.cssRules);
  return Array.from(sheet.cssRules)
    .map((r) => r.cssText)
    .join('\n');
};

/**
 * The `data-style-loc` marking the footer row, in the sidebar and in the
 * mobile bar's sheet. The footer is not a selectable element (it has no
 * `data-loc`), so its own styles are keyed to this instead.
 */
export const FOOTER_STYLE_LOC = 'footer';

/** The footer's `align` as the button row's flex `justify-content`. */
export const FOOTER_JUSTIFY: Record<Align, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

/**
 * Turns a `class` hook (one or more space-separated names) into classMap
 * entries, so it can be spread into a built-in class list.
 */
export const hookClassMap = (cls: string | undefined): Record<string, boolean> =>
  Object.fromEntries(
    (cls ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => [name, true]),
  );
