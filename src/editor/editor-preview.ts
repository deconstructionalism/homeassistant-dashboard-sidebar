import { html, type TemplateResult } from 'lit';

/**
 * Faded skeleton rows standing in for the content beside a pinned region:
 * fading up (toward the top) above a footer, or down (toward the bottom) below a
 * header.
 */
export const renderGhost = (fade: 'up' | 'down'): TemplateResult => {
  const widths = [72, 54, 84, 48, 66, 60, 78, 50];
  return html`
    <div class="pv-ghost fade-${fade}">
      ${widths.map(
        (w) =>
          html`<div class="ghost-row">
            <span class="ghost-icon"></span><span class="ghost-bar" style="width: ${w}%"></span>
          </div>`,
      )}
    </div>
  `;
};

/**
 * Faded skeleton cards standing in for dashboard content beside the mobile
 * bar: a two-column grid of cards with icon and text-line innards, fading
 * away from the bar's edge.
 */
export const renderGhostCards = (fade: 'up' | 'down'): TemplateResult => {
  return html`
    <div class="pv-ghost-cards fade-${fade}">
      <div class="ghost-card">
        <span class="ghost-dot"></span>
        <span class="ghost-line" style="width: 72%"></span>
        <span class="ghost-line" style="width: 46%"></span>
        <span class="ghost-line" style="width: 64%"></span>
        <span class="ghost-line" style="width: 38%"></span>
      </div>
      <div class="ghost-card">
        <span class="ghost-line" style="width: 82%"></span>
        <span class="ghost-line" style="width: 58%"></span>
        <span class="ghost-line" style="width: 70%"></span>
        <span class="ghost-line" style="width: 44%"></span>
        <span class="ghost-line" style="width: 62%"></span>
      </div>
      <div class="ghost-card wide">
        <span class="ghost-row-line">
          <span class="ghost-dot"></span>
          <span class="ghost-line" style="width: 38%"></span>
        </span>
        <span class="ghost-line" style="width: 86%"></span>
        <span class="ghost-line" style="width: 64%"></span>
        <span class="ghost-line" style="width: 78%"></span>
        <span class="ghost-line" style="width: 52%"></span>
      </div>
    </div>
  `;
};

/**
 * The borderless empty state for a region with no elements: a short prompt and
 * the given add control.
 */
export const renderEmptyState = (add: TemplateResult): TemplateResult => html`
  <div class="empty-state">
    <p class="empty-msg">Add your first element for this area to show up.</p>
    ${add}
  </div>
`;
