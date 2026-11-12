/**
 * Visibility conditions for the whole sidebar (and its mobile bar), in the
 * shapes Home Assistant's own card Visibility tab uses, so the same YAML works
 * here. The sidebar shows only when every condition in the list holds.
 */

/** Shown only to the listed users (Home Assistant user ids). */
export interface UserCondition {
  /** Condition discriminator. */
  condition: 'user';
  /** User ids (Settings › People › Users), not names, so a rename keeps working. */
  users: string[];
}

/** Shown only while a CSS media query matches, e.g. a minimum screen width. */
export interface ScreenCondition {
  /** Condition discriminator. */
  condition: 'screen';
  /** A CSS media query, e.g. `(min-width: 1024px)`. */
  media_query: string;
}

/** Shown only while an entity is (or isn't) in one of the given states. */
export interface StateCondition {
  /** Condition discriminator. */
  condition: 'state';
  /** The entity to read. */
  entity: string;
  /** The state, or states, the entity must be in. */
  state?: string | string[];
  /** The state, or states, the entity must not be in. */
  state_not?: string | string[];
}

/** Shown only while an entity's numeric state is above and/or below a value. */
export interface NumericStateCondition {
  /** Condition discriminator. */
  condition: 'numeric_state';
  /** The entity to read. */
  entity: string;
  /** Strict lower bound. */
  above?: number;
  /** Strict upper bound. */
  below?: number;
}

/** Combines conditions: all (`and`), any (`or`), or none (`not`) must hold. */
export interface GroupCondition {
  /** Condition discriminator. */
  condition: 'and' | 'or' | 'not';
  /** The combined conditions. */
  conditions: VisibilityCondition[];
}

/** One visibility condition. */
export type VisibilityCondition =
  UserCondition | ScreenCondition | StateCondition | NumericStateCondition | GroupCondition;

/** The condition types understood, for validation. */
export const CONDITION_TYPES = [
  'user',
  'screen',
  'state',
  'numeric_state',
  'and',
  'or',
  'not',
] as const;

/** What a condition reads: the current user, entity states, and media queries. */
export interface VisibilityContext {
  /** The current Home Assistant user's id, when known. */
  userId?: string;
  /** Entity states by id. */
  states?: Record<string, { state: string } | undefined>;
  /** Whether a media query matches right now. */
  matches: (query: string) => boolean;
}

/** The context from a hass object and the window. */
export const visibilityContext = (hass: unknown): VisibilityContext => {
  const h = hass as
    { user?: { id?: string }; states?: Record<string, { state: string }> } | undefined;
  return {
    userId: h?.user?.id,
    states: h?.states,
    matches: (query) =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : true,
  };
};

const asList = (v: string | string[] | undefined): string[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

/** Whether one condition holds. An unknown condition type never does. */
export const conditionMet = (c: VisibilityCondition, ctx: VisibilityContext): boolean => {
  switch (c.condition) {
    case 'user':
      return ctx.userId !== undefined && (c.users ?? []).includes(ctx.userId);
    case 'screen':
      return ctx.matches(c.media_query);
    case 'state': {
      // As in Home Assistant, an entity that doesn't exist reads as unavailable.
      const state = ctx.states?.[c.entity]?.state ?? 'unavailable';
      const is = asList(c.state);
      const isNot = asList(c.state_not);
      return (is === undefined || is.includes(state)) && !(isNot ?? []).includes(state);
    }
    case 'numeric_state': {
      const value = Number(ctx.states?.[c.entity]?.state);
      if (Number.isNaN(value)) {
        return false;
      }
      return (
        (c.above === undefined || value > c.above) && (c.below === undefined || value < c.below)
      );
    }
    case 'and':
      return (c.conditions ?? []).every((x) => conditionMet(x, ctx));
    case 'or':
      return (c.conditions ?? []).some((x) => conditionMet(x, ctx));
    case 'not':
      return !(c.conditions ?? []).some((x) => conditionMet(x, ctx));
    default:
      return false;
  }
};

/** Whether every condition holds. No conditions (or an empty list) means shown. */
export const conditionsMet = (
  conditions: VisibilityCondition[] | undefined,
  ctx: VisibilityContext,
): boolean => (conditions ?? []).every((c) => conditionMet(c, ctx));
