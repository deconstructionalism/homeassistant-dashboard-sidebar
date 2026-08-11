import { css } from 'lit';

/**
 * Text blocks: title, clock, and date. Their horizontal padding matches the
 * menu rows so left-aligned text lines up with the item icons.
 */
export const headerStyles = css`
  /* Keep header text on one line and clip it, so it never wraps and grows the
     block while the sidebar width animates during a collapse/expand. */
  .app-title,
  .clock,
  .date {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .app-title {
    font-size: var(--ha-font-size-xl, 1.25rem);
    font-weight: var(--ha-font-weight-medium, 500);
    padding: 2px 12px;
  }

  .clock {
    font-size: var(--ha-font-size-2xl, 1.5rem);
    font-weight: var(--ha-font-weight-light, 300);
    font-variant-numeric: tabular-nums;
    padding: 0 12px;
  }

  .collapsed .clock {
    font-size: var(--ha-font-size-m, 0.85rem);
    padding: 0;
  }

  .date {
    font-size: var(--ha-font-size-m, 0.9rem);
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
    padding: 0 12px;
  }

  .collapsed .date {
    font-size: var(--ha-font-size-s, 0.7rem);
    padding: 0;
  }
`;
