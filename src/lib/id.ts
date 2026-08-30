/**
 * Memorable element ids.
 *
 * Every sidebar element carries a unique `id`. Hand-written YAML can use any
 * string; the editor stamps generated ones so nobody has to invent names. The
 * generated form is a four-word phrase (`overrode-contact-beefy-tremble`):
 * unique enough to never collide in practice, readable enough to survive a
 * YAML diff without looking like line noise.
 */

/** Past-tense verbs for the first slot. */
const VERBS = [
  'overrode',
  'guarded',
  'painted',
  'drifted',
  'anchored',
  'braided',
  'carved',
  'dimmed',
  'echoed',
  'folded',
  'gathered',
  'hummed',
  'jolted',
  'kindled',
  'looped',
  'mended',
  'nudged',
  'orbited',
  'paced',
  'quoted',
  'rippled',
  'sketched',
  'tilted',
  'unwound',
  'vaulted',
  'wandered',
  'yielded',
  'zoomed',
  'blinked',
  'chimed',
  'dozed',
  'ferried',
  'glowed',
  'hopped',
  'inked',
  'juggled',
  'knotted',
  'lifted',
  'mirrored',
  'nested',
  'opened',
  'polished',
  'quivered',
  'rounded',
  'stacked',
  'traced',
  'ushered',
  'varnished',
] as const;

/** Concrete nouns for the second slot. */
const NOUNS_A = [
  'contact',
  'lantern',
  'harbor',
  'meadow',
  'copper',
  'signal',
  'ledger',
  'compass',
  'thimble',
  'orchard',
  'pillar',
  'ribbon',
  'saddle',
  'tunnel',
  'vessel',
  'window',
  'anchor',
  'basket',
  'canyon',
  'dial',
  'ember',
  'fiddle',
  'garnet',
  'hollow',
  'island',
  'jigsaw',
  'kettle',
  'lattice',
  'marble',
  'nickel',
  'oyster',
  'pebble',
  'quarry',
  'rocket',
  'shutter',
  'timber',
  'umbrella',
  'violin',
  'walnut',
  'yarn',
  'zephyr',
  'beacon',
  'cinder',
  'drum',
  'easel',
  'flint',
  'grove',
  'hinge',
] as const;

/** Adjectives for the third slot. */
const ADJECTIVES = [
  'beefy',
  'amber',
  'brisk',
  'candid',
  'dapper',
  'eager',
  'feral',
  'gentle',
  'hardy',
  'ivory',
  'jovial',
  'keen',
  'limber',
  'mellow',
  'nimble',
  'opal',
  'plucky',
  'quirky',
  'rustic',
  'sturdy',
  'tidy',
  'umber',
  'vivid',
  'wiry',
  'young',
  'zesty',
  'bold',
  'crisp',
  'dusky',
  'earnest',
  'frosty',
  'glossy',
  'humble',
  'iron',
  'jaunty',
  'kindred',
  'lively',
  'minty',
  'noble',
  'oaken',
  'pale',
  'quiet',
  'rosy',
  'silken',
  'tart',
  'upbeat',
  'velvet',
  'warm',
] as const;

/** Closing nouns for the fourth slot. */
const NOUNS_B = [
  'tremble',
  'summit',
  'thicket',
  'current',
  'harvest',
  'lagoon',
  'monsoon',
  'nettle',
  'outpost',
  'prairie',
  'ravine',
  'sonnet',
  'trellis',
  'upland',
  'vortex',
  'willow',
  'aurora',
  'boulder',
  'cascade',
  'delta',
  'estuary',
  'fjord',
  'geyser',
  'horizon',
  'inlet',
  'juniper',
  'knoll',
  'lichen',
  'mesa',
  'nimbus',
  'oasis',
  'plateau',
  'quartz',
  'riverbed',
  'sequoia',
  'tundra',
  'undertow',
  'valley',
  'wharf',
  'yonder',
  'zenith',
  'bramble',
  'cove',
  'dune',
  'eddy',
  'floe',
  'glacier',
  'heath',
] as const;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * Generates a unique four-word phrase id.
 *
 * The chosen id is added to `existing` before returning, so sequential calls
 * against the same set can never collide with each other.
 *
 * @param existing - Ids already present in the config; mutated with the result.
 * @returns A phrase id not present in `existing` at call time.
 */
export const generateId = (existing: Set<string>): string => {
  for (;;) {
    const id = [pick(VERBS), pick(NOUNS_A), pick(ADJECTIVES), pick(NOUNS_B)].join('-');
    if (!existing.has(id)) {
      existing.add(id);
      return id;
    }
  }
};

/** The shape walked for ids: regions of blocks, categories of items, footer buttons. */
interface IdBearingConfig {
  /** Header blocks, possibly with nested category items. */
  header?: { id?: string; items?: { id?: string }[] }[];
  /** Body blocks, possibly with nested category items. */
  body?: { id?: string; items?: { id?: string }[] }[];
  /** The footer and its buttons. */
  footer?: { buttons?: { id?: string }[] };
}

/**
 * Collects every element id present in a config: header and body blocks,
 * items nested in categories, and footer buttons.
 *
 * @param config - The sidebar config to walk.
 * @returns The set of ids found (missing ids are simply absent).
 */
export const collectIds = (config: IdBearingConfig): Set<string> => {
  const ids = new Set<string>();
  const take = (el?: { id?: string }): void => {
    if (el?.id) {
      ids.add(el.id);
    }
  };
  for (const block of [...(config.header ?? []), ...(config.body ?? [])]) {
    take(block);
    for (const child of block.items ?? []) {
      take(child);
    }
  }
  for (const btn of config.footer?.buttons ?? []) {
    take(btn);
  }
  return ids;
};

/**
 * Stamps a generated id onto every element that lacks one, in place.
 * The editor uses this to adopt configs authored before ids were required;
 * tests use it to keep fixtures terse.
 *
 * @param config - The sidebar config to complete.
 * @returns The same config, every element carrying an id.
 */
export const stampMissingIds = <T extends IdBearingConfig>(config: T): T => {
  if (!config || typeof config !== 'object') {
    return config;
  }
  const ids = collectIds(config);
  const stamp = (el?: { id?: string }): void => {
    if (el && typeof el === 'object' && !el.id) {
      el.id = generateId(ids);
    }
  };
  const list = <E>(v: E[] | undefined): E[] => (Array.isArray(v) ? v : []);
  for (const block of [...list(config.header), ...list(config.body)]) {
    stamp(block);
    for (const child of list(block.items)) {
      stamp(child);
    }
  }
  for (const btn of list(config.footer?.buttons)) {
    stamp(btn);
  }
  return config;
};
