import { css } from 'lit';

/**
 * Styles for the mobile bar. Chrome carries dashboard-sidebar-bar-* classes
 * so card-mod and themes can target every part, mirroring the sidebar's
 * conventions. The bar is fixed to the bottom edge and pads for the iOS
 * home-indicator safe area.
 */
export const barStyles = css`
  :host([data-position='top']) {
    inset: 0 0 auto;
  }

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
    --dashboard-sidebar-hover-background: var(--divider-color, rgb(0 0 0 / 8%));
    --dashboard-sidebar-on-accent-color: var(--text-primary-color, #fff);
    --dashboard-sidebar-divider-color: var(--divider-color, rgb(0 0 0 / 12%));
    --dashboard-sidebar-background: var(
      --card-background-color,
      var(--primary-background-color, #fff)
    );
  }

  .dashboard-sidebar-bar {
    position: relative;
    z-index: 2;
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

  :host([data-position='top']) .dashboard-sidebar-bar {
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: 0;
    border-top: none;
    border-bottom: 1px solid var(--divider-color, rgb(127 127 127 / 20%));
  }

  :host([data-position='top']) .dashboard-sidebar-bar-flyout {
    top: calc(100% + 8px);
    bottom: auto;
  }

  :host([data-position='top']) .dashboard-sidebar-bar-sheet {
    top: 100%;
    bottom: auto;
    border-top: none;
    border-bottom: 1px solid var(--divider-color, rgb(127 127 127 / 20%));
    border-radius: 0 0 var(--dashboard-sidebar-bar-sheet-radius, 16px)
      var(--dashboard-sidebar-bar-sheet-radius, 16px);
    box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
    animation-name: dashboard-sidebar-bar-drop;
  }

  @keyframes dashboard-sidebar-bar-drop {
    from {
      transform: translateY(-100%);
    }
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
    padding: 6px 0;
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
    padding: 2px 8px;
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

  @media (hover: hover) {
    .dashboard-sidebar-bar-slot:hover .dashboard-sidebar-bar-icon,
    .dashboard-sidebar-bar-slot:hover .dashboard-sidebar-bar-time {
      background: var(--dashboard-sidebar-hover-background);
    }
  }

  /* An open category or menu trigger matches the desktop collapsed rail's
     open state: a solid accent pill with on-accent text. */
  .dashboard-sidebar-bar-slot-open {
    color: var(--dashboard-sidebar-on-accent-color);
  }

  .dashboard-sidebar-bar-slot-open .dashboard-sidebar-bar-icon,
  .dashboard-sidebar-bar-slot-open .dashboard-sidebar-bar-time {
    background: var(--dashboard-sidebar-accent-color);
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

  .dashboard-sidebar-bar-sheet-scrim {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: var(--dashboard-sidebar-bar-scrim-color, rgb(0 0 0 / 32%));
    animation: dashboard-sidebar-bar-fade 0.15s ease-out;
  }

  .dashboard-sidebar-bar-sheet {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    max-height: 70vh;
    padding: 8px;
    background: var(--dashboard-sidebar-bar-sheet-background, var(--dashboard-sidebar-background));
    border-top: 1px solid var(--divider-color, rgb(127 127 127 / 20%));
    border-radius: var(--dashboard-sidebar-bar-sheet-radius, 16px)
      var(--dashboard-sidebar-bar-sheet-radius, 16px) 0 0;
    box-shadow: 0 -4px 16px rgb(0 0 0 / 25%);

    /* The same slide the sidebar uses when collapsing/expanding (0.25s ease):
       the sheet slides out from behind the bar, which stacks above it. */
    animation: dashboard-sidebar-bar-rise 0.25s ease;
  }

  @keyframes dashboard-sidebar-bar-rise {
    from {
      transform: translateY(100%);
    }
  }

  .dashboard-sidebar-bar-sheet.closing {
    animation: dashboard-sidebar-bar-rise-out 0.25s ease forwards;
    pointer-events: none;
  }

  @keyframes dashboard-sidebar-bar-rise-out {
    to {
      transform: translateY(100%);
    }
  }

  :host([data-position='top']) .dashboard-sidebar-bar-sheet.closing {
    animation-name: dashboard-sidebar-bar-drop-out;
  }

  @keyframes dashboard-sidebar-bar-drop-out {
    to {
      transform: translateY(-100%);
    }
  }

  .dashboard-sidebar-bar-sheet-scrim.closing {
    animation: dashboard-sidebar-bar-fade-out 0.25s ease forwards;
    pointer-events: none;
  }

  @keyframes dashboard-sidebar-bar-fade-out {
    to {
      opacity: 0;
    }
  }

  @keyframes dashboard-sidebar-bar-fade {
    from {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-sidebar-bar-sheet,
    .dashboard-sidebar-bar-sheet-scrim,
    .dashboard-sidebar-bar-sheet.closing,
    .dashboard-sidebar-bar-sheet-scrim.closing {
      animation: none;
    }

    .dashboard-sidebar-bar-sheet.closing,
    .dashboard-sidebar-bar-sheet-scrim.closing {
      visibility: hidden;
    }
  }

  .dashboard-sidebar-bar-sheet-rows {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    overflow-y: auto;
  }

  .dashboard-sidebar-bar-sheet-row {
    display: flex;
    flex: 0 0 auto;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    border: none;
    border-radius: var(--dashboard-sidebar-item-radius);
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .dashboard-sidebar-bar-sheet-row:hover,
  .dashboard-sidebar-bar-sheet-row:focus-visible {
    background: var(--dashboard-sidebar-hover-background);
  }

  /* Category headers match the desktop expanded sidebar: bold, slightly
     dimmed, with the chevron rotating shut. */
  .dashboard-sidebar-bar-sheet-category {
    font-weight: var(--ha-font-weight-bold, 600);
    opacity: 0.85;
  }

  .dashboard-sidebar-bar-sheet-row .dashboard-sidebar-bar-icon {
    padding: 0;
  }

  .dashboard-sidebar-bar-sheet-row-active {
    color: var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-text-color));
    background: color-mix(
      in srgb,
      var(--dashboard-sidebar-bar-active-color, var(--dashboard-sidebar-accent-color)) 14%,
      transparent
    );
  }

  .dashboard-sidebar-bar-sheet-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--ha-font-size-l, 1rem);
  }

  .dashboard-sidebar-bar-sheet-chevron {
    --mdc-icon-size: 20px;

    flex: 0 0 auto;
    opacity: 0.7;
    transition: transform 0.2s ease;
  }

  .dashboard-sidebar-bar-sheet-chevron:not(.open) {
    transform: rotate(-90deg);
  }

  /* Children hang off the desktop guide line. */
  .dashboard-sidebar-bar-sheet-children {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 8px;
    border-left: 1px solid var(--dashboard-sidebar-divider-color);
    margin-left: 18px;
  }

  /* Curated titles follow the desktop app-title treatment. */
  .dashboard-sidebar-bar-sheet-title {
    padding: 10px 12px 4px;
    overflow: hidden;
    font-size: var(--ha-font-size-xl, 1.25rem);
    font-weight: var(--ha-font-weight-medium, 500);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dashboard-sidebar-bar-sheet-title.clickable {
    cursor: pointer;
  }

  .dashboard-sidebar-bar-sheet-card {
    flex: 0 0 auto;
    min-width: 0;
  }

  .dashboard-sidebar-bar-sheet-time {
    cursor: default;
    font-variant-numeric: tabular-nums;
  }

  .dashboard-sidebar-bar-sheet-divider {
    flex: 0 0 1px;
    margin: 6px 10px;
    background: var(--divider-color, rgb(127 127 127 / 30%));
  }

  /* The pinned button row follows the desktop footer's styling. */
  .dashboard-sidebar-bar-sheet-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--dashboard-sidebar-divider-color);
  }

  .dashboard-sidebar-bar-sheet-footer.no-divider {
    border-top: none;
    padding-top: 0;
  }

  .dashboard-sidebar-bar-sheet-footer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: var(--dashboard-sidebar-item-radius);
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .dashboard-sidebar-bar-sheet-footer-btn:hover,
  .dashboard-sidebar-bar-sheet-footer-btn:focus-visible {
    background: var(--dashboard-sidebar-hover-background);
  }

  .dashboard-sidebar-bar-sheet-footer-btn .dashboard-sidebar-bar-icon {
    padding: 0;
  }

  .dashboard-sidebar-bar-sheet-footer-content {
    flex: 1 1 auto;
    min-width: 0;
  }

  .dashboard-sidebar-bar-sheet-footer-content.clickable {
    cursor: pointer;
  }

  .dashboard-sidebar-bar-flyout-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
