import type { ActionConfig } from 'custom-card-helpers';
import { generateId } from '../lib/id';

import type {
  BlockType,
  FooterButtonConfig,
  Region,
  SidebarBlock,
  DashboardSidebarConfig,
} from '../lib/types';

/** A block's location within one sidebar. */
export interface BlockLocation {
  /** Which region the block is in. */
  region: Region;
  /** The block's index within that region. */
  index: number;
}

/** The default tap action for newly added items and footer buttons. */
const NO_ACTION = { action: 'none' } as unknown as ActionConfig;

/**
 * Whether a block may live in the given region. A title block is confined to
 * the header, so it can never be placed in the body.
 */
export const canPlace = (block: SidebarBlock, region: Region): boolean => {
  return !(block.type === 'title' && region === 'body');
};

/**
 * Moves a block between regions/indices within one sidebar, returning a new
 * config. A move the title-in-header rule forbids returns the input unchanged.
 */
export const moveBlock = (
  config: DashboardSidebarConfig,
  from: BlockLocation,
  to: BlockLocation,
): DashboardSidebarConfig => {
  const header = [...(config.header ?? [])];
  const body = [...(config.body ?? [])];
  const src = from.region === 'header' ? header : body;
  const block = src[from.index];
  if (!block || !canPlace(block, to.region)) {
    return config;
  }
  src.splice(from.index, 1);
  const dst = to.region === 'header' ? header : body;
  const index = Math.max(0, Math.min(to.index, dst.length));
  dst.splice(index, 0, block);
  return { ...config, header, body };
};

/**
 * Creates a new block of the given type with sensible defaults and a
 * generated id. `existing` guards against collisions and is extended with
 * every id handed out.
 */
export const defaultBlock = (type: BlockType, existing: Set<string> = new Set()): SidebarBlock => {
  const id = generateId(existing);
  switch (type) {
    case 'title':
      return { type: 'title', text: 'Title', id };
    case 'clock':
      return { type: 'clock', id };
    case 'date':
      return { type: 'date', id };
    case 'divider':
      return { type: 'divider', id };
    case 'item':
      return { type: 'item', title: 'Item', tap_action: NO_ACTION, id };
    case 'category':
      return {
        type: 'category',
        title: 'Category',
        id,
        items: [{ type: 'item', title: 'Item', tap_action: NO_ACTION, id: generateId(existing) }],
      };
    case 'markdown':
      return { type: 'markdown', content: 'Markdown **content**', id };
    case 'card':
    default:
      return { type: 'card', card: { type: 'markdown', content: 'Card content' }, id };
  }
};

/**
 * Creates a new footer button with sensible defaults and a generated id.
 */
export const defaultFooterButton = (existing: Set<string> = new Set()): FooterButtonConfig => {
  return { icon: 'mdi:star', tap_action: NO_ACTION, id: generateId(existing) };
};

/**
 * Creates a starter sidebar config for a newly added side.
 */
export const starterSidebar = (): DashboardSidebarConfig => {
  return {
    body: [{ type: 'item', title: 'Item', tap_action: NO_ACTION, id: generateId(new Set()) }],
  };
};
