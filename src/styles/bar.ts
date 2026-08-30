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
  }

  .dashboard-sidebar-bar-slot {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
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
    --mdc-icon-size: 24px;
    display: flex;
  }

  .dashboard-sidebar-bar-abbr {
    font-size: 14px;
    font-weight: 600;
    line-height: 24px;
  }

  .dashboard-sidebar-bar-label {
    max-width: 100%;
    overflow: hidden;
    font-size: 10px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dashboard-sidebar-bar-slot-active {
    color: var(--dashboard-sidebar-bar-active-color, var(--primary-color));
  }

  .dashboard-sidebar-bar-slot-category .dashboard-sidebar-bar-icon {
    position: relative;
  }

  .dashboard-sidebar-bar-caret {
    --mdc-icon-size: 12px;
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.6;
  }

  .dashboard-sidebar-bar-slot-open {
    color: var(--dashboard-sidebar-bar-active-color, var(--primary-color));
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

  .dashboard-sidebar-bar-flyout-row-active {
    color: var(--dashboard-sidebar-bar-active-color, var(--primary-color));
  }

  .dashboard-sidebar-bar-flyout-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
