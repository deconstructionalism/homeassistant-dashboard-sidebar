import { css } from 'lit';

/**
 * Styles for the mobile bar. Chrome carries dashboard-sidebar-bar-* classes
 * so card-mod and themes can target every part, mirroring the sidebar's
 * conventions. The bar is fixed to the bottom edge and pads for the iOS
 * home-indicator safe area.
 */
export const barStyles = css`
  :host {
    position: fixed;
    inset: auto 0 0;
    z-index: 6;

    /* The same accent chain the sidebar uses, so the bar's active treatment
       matches the desktop nav-active look under any theme. */
    --dashboard-sidebar-accent-color: var(
      --sidebar-selected-icon-color,
      var(--primary-color, #03a9f4)
    );
    --dashboard-sidebar-accent-text-color: var(
      --sidebar-selected-text-color,
      var(--dashboard-sidebar-accent-color)
    );
    --dashboard-sidebar-item-radius: var(--ha-card-border-radius, 10px);
  }

  .dashboard-sidebar-bar {
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    width: 100%;
    min-height: var(--dashboard-sidebar-bar-height, 56px);
    padding-bottom: env(safe-area-inset-bottom, 0);
    background: var(
      --dashboard-sidebar-bar-background,
      var(--ha-card-background, var(--card-background-color, #fff))
    );
    border-top: 1px solid var(--divider-color, rgb(127 127 127 / 20%));
  }

  .dashboard-sidebar-bar-slots {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    align-items: stretch;
    justify-content: center;
  }

  .dashboard-sidebar-bar-slot {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    max-width: var(--dashboard-sidebar-bar-slot-max-width, 88px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 2px;
    border: none;
    background: none;
    color: var(--primary-text-color);
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .dashboard-sidebar-bar-slot:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .dashboard-sidebar-bar-icon {
    --mdc-icon-size: var(--dashboard-sidebar-bar-icon-size, 28px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: var(--dashboard-sidebar-item-radius);
  }

  .dashboard-sidebar-bar-abbr {
    font-size: 15px;
    font-weight: 600;
    line-height: var(--dashboard-sidebar-bar-icon-size, 28px);
  }

  .dashboard-sidebar-bar-label {
    max-width: 100%;
    overflow: hidden;
    font-size: 10px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Clock and date slots use the desktop sidebar's collapsed compact text. */
  .dashboard-sidebar-bar-time {
    padding: 4px 10px;
    border-radius: var(--dashboard-sidebar-item-radius);
    font-size: var(--ha-font-size-m, 0.85rem);
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
    white-space: nowrap;
  }

  .dashboard-sidebar-bar-slot-date .dashboard-sidebar-bar-time {
    font-size: var(--ha-font-size-s, 0.7rem);
    opacity: 0.75;
  }

  /* An element whose navigate action targets the current page gets the same
     treatment as the desktop sidebar's nav-active: accent text plus a tinted
     pill behind the icon or time. Inline icon colors still win, as they do
     on desktop. */
  .dashboard-sidebar-bar-slot-active {
    color: var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-text-color));
  }

  .dashboard-sidebar-bar-slot-active .dashboard-sidebar-bar-icon,
  .dashboard-sidebar-bar-slot-active .dashboard-sidebar-bar-time {
    background: color-mix(
      in srgb,
      var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-color)) 14%,
      transparent
    );
  }

  .dashboard-sidebar-bar-slot-open {
    color: var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-text-color));
  }

  .dashboard-sidebar-bar-divider {
    flex: 0 0 1px;
    align-self: stretch;
    margin: 10px 2px;
    background: var(--divider-color, rgb(127 127 127 / 30%));
  }

  .dashboard-sidebar-bar-flyout {
    position: absolute;
    bottom: calc(100% + 8px);
    display: flex;
    flex-direction: column;
    width: var(--dashboard-sidebar-bar-flyout-width, 200px);
    max-height: 60vh;
    padding: 6px;
    overflow-y: auto;
    background: var(
      --dashboard-sidebar-bar-background,
      var(--ha-card-background, var(--card-background-color, #fff))
    );
    border: 1px solid var(--divider-color, rgb(127 127 127 / 20%));
    border-radius: 12px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
  }

  .dashboard-sidebar-bar-flyout-row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--primary-text-color);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .dashboard-sidebar-bar-flyout-row:hover,
  .dashboard-sidebar-bar-flyout-row:focus-visible {
    background: rgb(127 127 127 / 12%);
  }

  .dashboard-sidebar-bar-flyout-row .dashboard-sidebar-bar-icon {
    padding: 0;
  }

  .dashboard-sidebar-bar-flyout-row-active {
    color: var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-text-color));
    background: color-mix(
      in srgb,
      var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-color)) 14%,
      transparent
    );
  }

  .dashboard-sidebar-bar-flyout-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
