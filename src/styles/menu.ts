import { css } from 'lit';

/**
 * Menu blocks: item rows, collapsed icon rows, categories with their guide
 * line and chevron, the fixed-position popover, and the entry divider.
 */
export const menuStyles = css`
  .row {
    display: flex;
    /* Rows are flex children of the scrolling region. Without this they shrink
       to absorb an over-full body instead of letting it scroll, so a long
       sidebar silently squashes its rows. */
    flex: 0 0 auto;
    /* Never wrap the icon/label onto a second line — during a collapse/expand
       the width animates through intermediate sizes, and wrapping made rows
       reflow/grow for a frame. Clip instead. */
    flex-wrap: nowrap;
    overflow: hidden;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: var(--dsb-item-radius);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row:hover {
    background: var(--dsb-hover-background);
  }

  .row .label {
    flex: 1;
    /* Shrink below content width and clip to one line with an ellipsis rather
       than wrapping while the sidebar animates. */
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ha-font-size-l, 1rem);
  }

  .collapsed-row {
    width: 44px;
    height: 44px;
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  .collapsed-row.active {
    background: var(--dsb-accent-color);
    color: var(--dsb-on-accent-color);
  }

  .initials {
    font-size: var(--ha-font-size-m, 0.85rem);
    font-weight: var(--ha-font-weight-bold, 600);
  }

  .category {
    margin: 4px 0;
  }

  .category-header {
    font-weight: var(--ha-font-weight-bold, 600);
    opacity: 0.85;
  }

  .chevron {
    --mdc-icon-size: 20px;

    flex: 0 0 auto;
    opacity: 0.7;
    transition: transform 0.2s ease;
  }

  .chevron:not(.open) {
    transform: rotate(-90deg);
  }

  .category-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 8px;
    border-left: 1px solid var(--dsb-divider-color);
    margin-left: 18px;
  }

  .category-items.no-line {
    border-left: none;
  }

  .category-anchor {
    position: relative;
  }

  .popover {
    position: fixed;
    min-width: 180px;
    padding: 8px;
    border: var(--dsb-border);
    border-radius: var(--dsb-radius);
    background: var(--dsb-surface-background);
    box-shadow: var(--dsb-popover-shadow);
    z-index: 9;
  }

  .popover-title {
    font-weight: var(--ha-font-weight-bold, 600);
    padding: 4px 12px 8px;
  }

  .entry-divider {
    flex: none;
    align-self: stretch;
    height: 1px;
    min-height: 1px;
    margin: 6px 4px;
    background: var(--dsb-divider-color);
  }

  .collapsed .entry-divider {
    width: 60%;
    margin: 6px auto;
  }
`;
