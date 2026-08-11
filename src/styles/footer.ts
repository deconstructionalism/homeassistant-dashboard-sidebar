import { css } from 'lit';

/** Bottom footer bar: its divider, the icon buttons, and the overflow popover. */
export const footerStyles = css`
  .footer {
    display: flex;
    /* The footer is a flex child of the sidebar column. Without this it shrinks
       to absorb an over-full body, and since it clips its overflow (below) the
       buttons lose their bottoms rather than the body scrolling for them. */
    flex: 0 0 auto;
    /* Keep the buttons on one row and clip any that don't fit rather than
       wrapping — during a collapse/expand the width animates through
       intermediate sizes, and wrapping made the buttons stack vertically for a
       frame before settling. The overflow menu already handles the real count. */
    flex-wrap: nowrap;
    overflow: hidden;
    gap: 4px;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--dsb-divider-color);
  }

  .collapsed .footer {
    justify-content: center;
  }

  .footer.no-divider {
    border-top: none;
    padding-top: 0;
  }

  .footer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: var(--dsb-item-radius);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .footer-btn:hover,
  .footer-btn.active {
    background: var(--dsb-hover-background);
  }

  .footer-popover {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
    width: max-content;
    max-width: 220px;
  }
`;
