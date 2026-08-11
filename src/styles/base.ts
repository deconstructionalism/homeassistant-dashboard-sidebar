import { css } from 'lit';

/**
 * Host box, sidebar column layout, the edge collapse toggle, and the default
 * icon color.
 *
 * Every color, radius, shadow, and type step in the sidebar resolves through a
 * `--dsb-*` variable defined here, and each of those reads a Home Assistant
 * theme variable first. Chrome (background, text, icons, the selected state)
 * follows the tokens themes already use for Home Assistant's own nav sidebar,
 * so a theme that styles that rail styles this one the same way; each falls
 * back to the general card/text tokens and finally to the built-in value, so a
 * theme that defines neither renders exactly as before. Overriding a `--dsb-*`
 * variable from card-mod restyles every element that uses it at once.
 */
export const baseStyles = css`
  :host {
    /* Surfaces and text. */
    --dsb-background: var(
      --sidebar-background-color,
      var(--card-background-color, var(--primary-background-color, #fff))
    );
    --dsb-surface-background: var(--dsb-background);
    --dsb-text-color: var(--sidebar-text-color, var(--primary-text-color, #000));
    --dsb-icon-color: var(
      --sidebar-icon-color,
      var(--paper-item-icon-color, var(--primary-text-color, #000))
    );
    --dsb-divider-color: var(--divider-color, rgb(0 0 0 / 12%));
    --dsb-hover-background: var(--divider-color, rgb(0 0 0 / 8%));

    /* The active/selected accent, and readable text on top of it. */
    --dsb-accent-color: var(--sidebar-selected-icon-color, var(--primary-color, #03a9f4));
    --dsb-accent-text-color: var(--sidebar-selected-text-color, var(--dsb-accent-color));
    --dsb-on-accent-color: var(--text-primary-color, #fff);

    /* Geometry: rows and floating surfaces follow the theme's card radius. */
    --dsb-item-radius: var(--ha-card-border-radius, 10px);
    --dsb-radius: var(--ha-card-border-radius, 12px);
    --dsb-tooltip-radius: var(--ha-card-border-radius, 6px);
    --dsb-border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--dsb-divider-color));

    /* Elevation. A theme that flattens its cards flattens these too; the
       popover keeps its border so it still reads as a separate surface. */
    --dsb-popover-shadow: var(--ha-card-box-shadow, 0 4px 16px rgb(0 0 0 / 30%));
    --dsb-tooltip-shadow: var(--ha-card-box-shadow, 0 2px 8px rgb(0 0 0 / 30%));
    --dsb-toggle-shadow: var(--ha-card-box-shadow, 0 1px 4px rgb(0 0 0 / 25%));

    display: block;
    height: 100%;
    box-sizing: border-box;
    color: var(--dsb-text-color);
    background: var(--dsb-background);
    /* Append color-emoji fonts so emoji render regardless of the inherited font
       stack (the editor preview's context otherwise lacks an emoji fallback). */
    font-family:
      var(--ha-font-family-body, inherit), 'Apple Color Emoji', 'Segoe UI Emoji',
      'Noto Color Emoji', sans-serif;
  }

  .sidebar {
    position: relative;
    display: flex;
    height: 100%;
    flex-direction: column;
    box-sizing: border-box;
    padding: 16px 12px;
    overflow: visible;
  }

  /* A title/clock/date with a tap action shows it is interactive. */
  .clickable {
    cursor: pointer;
  }

  /* An element whose navigate action targets the current page is highlighted
     with the theme accent (rows/buttons also get a tinted pill). */
  .nav-active {
    color: var(--dsb-accent-text-color);
  }

  .row.nav-active,
  .footer-btn.nav-active {
    background: color-mix(in srgb, var(--dsb-accent-color) 14%, transparent);
    border-radius: var(--dsb-item-radius);
  }

  .nav-active ha-icon,
  .nav-active .dashboard-sidebar-item-icon {
    color: var(--dsb-accent-color);
  }

  /* Inert single-block preview embedded in the editor: no host box, no
     interaction, sized to its content. */
  :host([preview]) {
    height: auto;
    background: transparent;
  }

  :host([preview]) .sidebar,
  :host([preview]) .sidebar.preview {
    height: auto;
    /* Keep the real horizontal inset so content sits where it will in the live
       sidebar, but no vertical padding so stacked previews stay compact. */
    padding: 0 12px;
  }

  /* Collapsed preview sits in a narrow icon-strip frame, so drop the inset. */
  :host([preview]) .sidebar.collapsed {
    padding: 0;
  }

  /* Every element in a preview is clickable to select and draggable to reorder,
     so show a pointer and mark the selected one with an outline. */
  :host([preview]) .row,
  :host([preview]) .app-title,
  :host([preview]) .clock,
  :host([preview]) .date,
  :host([preview]) .entry-divider,
  :host([preview]) .content,
  :host([preview]) .footer-btn {
    cursor: pointer;
  }

  /* Give the divider a taller hit area so it can be selected and dragged, while
     the visible line stays 1px like live: the vertical margin becomes padding
     (same footprint) and the background paints only the 1px content strip. */
  :host([preview]) .entry-divider {
    box-sizing: content-box;
    min-height: 1px;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 6px;
    padding-bottom: 6px;
    background-clip: content-box;
  }

  :host([preview]) .sb-selected {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
    border-radius: 8px;
  }

  :host([preview]) .sortable-ghost {
    opacity: 0.4;
  }

  :host([preview]) .region-header {
    margin-bottom: 0;
  }

  :host([preview]) .region-body {
    overflow: visible;
  }

  :host([preview]) .footer {
    margin-top: 0;
  }

  /* Whole-sidebar preview (the Settings tab): fill the flex-column preview frame
     all the way down — host, then sidebar — via flex (not a percentage height,
     which does not resolve reliably through the frame's flex item) so the body
     grows and the footer pins to the bottom, mirroring the live sidebar. */
  :host([preview][full]) {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  :host([preview][full]) .sidebar {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
  }

  :host([preview][full]) .region-body {
    overflow-y: auto;
  }

  :host([preview][full]) .footer {
    margin-top: 8px;
  }

  .sidebar.collapsed {
    align-items: center;
    padding: 16px 6px;
  }

  .toggle {
    position: absolute;
    top: 16px;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--dsb-divider-color);
    border-radius: 50%;
    background: var(--dsb-surface-background);
    color: var(--dsb-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 6;
    box-shadow: var(--dsb-toggle-shadow);
  }

  .pos-left .toggle {
    right: -13px;
  }

  .pos-right .toggle {
    left: -13px;
  }

  .toggle ha-icon {
    --mdc-icon-size: 18px;

    transition: transform 0.2s ease;
  }

  .pos-right .toggle ha-icon {
    transform: rotate(180deg);
  }

  .collapsed.pos-left .toggle ha-icon {
    transform: rotate(180deg);
  }

  .collapsed.pos-right .toggle ha-icon {
    transform: rotate(0deg);
  }

  .edit-btn {
    position: absolute;
    top: 16px;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--dsb-divider-color);
    border-radius: 50%;
    background: var(--dsb-surface-background);
    color: var(--dsb-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 6;
  }

  .pos-left .edit-btn {
    left: 8px;
  }

  .pos-right .edit-btn {
    right: 8px;
  }

  .edit-btn ha-icon {
    --mdc-icon-size: 16px;
  }

  ha-icon {
    color: var(--dsb-icon-color);
  }

  .tooltip {
    position: fixed;
    transform: translateY(-50%);
    padding: 4px 8px;
    border-radius: var(--dsb-tooltip-radius);
    background: var(--dsb-surface-background);
    color: var(--dsb-text-color);
    box-shadow: var(--dsb-tooltip-shadow);
    font-size: var(--ha-font-size-m, 0.85rem);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
  }

  /* Placed above its control rather than beside it: anchored by its bottom
     edge, so the half-height shift the beside placement needs would push it
     out of place. */
  .tooltip.above {
    transform: none;
  }
`;
