import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { runAction, type RunnableAction } from './lib/action';
import { applyCardMod } from './lib/card-mod';
import { formatClock, formatDate } from './lib/format';
import { resolveBar, type BarEntry, type ResolvedBar } from './lib/mobile';
import { TemplateManager } from './lib/templates';
import { barStyles } from './styles/bar';
import type {
  CategoryBlock,
  ClockBlock,
  DashboardSidebarConfig,
  DateBlock,
  FooterButtonConfig,
  ItemBlock,
  SidebarBlock,
} from './lib/types';
import type { HomeAssistant } from 'custom-card-helpers';

/** The minimum width one bar slot needs before the tail folds into the menu. */
const MIN_SLOT_WIDTH = 64;

/**
 * The mobile bottom bar. Renders the resolved slots (items, categories,
 * clocks, dates, dividers) with icons, optional labels, live templates, and
 * the nav-active highlight. Footer buttons and any slots that do not fit the
 * viewport fold into a trailing dots menu; categories and the menu open the
 * same upward flyout. Chrome carries dashboard-sidebar-bar-* classes so
 * card-mod and themes can target every part.
 */
@customElement('dashboard-sidebar-bar')
export class DashboardSidebarBar extends LitElement {
  /** Shared styles. */
  static styles = barStyles;

  /** The current Home Assistant object; updates re-render live templates. */
  @property({ attribute: false })
  public set hass(value: HomeAssistant | undefined) {
    this._hass = value;
    this._templates.setHass(value);
  }

  /** The stored Home Assistant object. */
  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  /** Backing store for the hass accessor. */
  private _hass?: HomeAssistant;

  /** The full sidebar config; the bar reads its `mobile` section. */
  @state() private _config?: DashboardSidebarConfig;

  /** The resolved bar, recomputed on config change. */
  @state() private _resolved: ResolvedBar = { slots: [], menu: [] };

  /** The current location path, tracked for the active highlight. */
  @state() private _path = window.location.pathname;

  /** How many slots fit the current width, from measurement. */
  @state() private _capacity = Infinity;

  /** The open flyout: the dots menu, a category's id, or none. */
  @state() private _open: 'menu' | string | null = null;

  /** The horizontal center of the slot the open flyout anchors to. */
  @state() private _anchorX = 0;

  /** The current tick for clock and date slots. */
  @state() private _now = new Date();

  /** Live template subscriptions for entry titles, icons, and colors. */
  private readonly _templates = new TemplateManager(() => this.requestUpdate());

  /** The clock tick handle, running only while a clock or date slot exists. */
  private _tick?: ReturnType<typeof setInterval>;

  /** Re-measures capacity as the viewport changes. */
  private readonly _resize = new ResizeObserver(() => this._measure());

  /** Re-reads the path when the frontend navigates. */
  private readonly _onLocationChange = (): void => {
    this._path = window.location.pathname;
    this._open = null;
  };

  /** Closes any open flyout when a tap lands outside the bar. */
  private readonly _onOutsideClick = (ev: Event): void => {
    if (this._open !== null && !ev.composedPath().includes(this)) {
      this._open = null;
    }
  };

  /**
   * Stores the config and resolves the bar. The config is expected to be
   * validated by the caller (the bootstrap only mounts valid configs).
   */
  public setConfig(config: DashboardSidebarConfig): void {
    this._config = config;
    this._resolved = resolveBar(config);
    // Collect templates from the resolved elements by presenting them to the
    // manager as a synthetic config in the shape it already understands.
    const body: SidebarBlock[] = [];
    const buttons: FooterButtonConfig[] = [];
    for (const entry of [...this._resolved.slots, ...this._resolved.menu]) {
      if (entry.kind === 'button') {
        buttons.push(entry.element as FooterButtonConfig);
      } else {
        body.push(entry.element as SidebarBlock);
      }
    }
    this._templates.collect({ body, footer: { buttons } });
    this._templates.setHass(this._hass);
    const timed = this._resolved.slots.some((e) => e.kind === 'clock' || e.kind === 'date');
    clearInterval(this._tick);
    this._tick = timed ? setInterval(() => (this._now = new Date()), 1000) : undefined;
  }

  /** Subscribes to navigation, resize, and outside taps while connected. */
  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('location-changed', this._onLocationChange);
    window.addEventListener('click', this._onOutsideClick, true);
    this._resize.observe(this);
    this._measure();
  }

  /** Unsubscribes on disconnect. */
  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocationChange);
    window.removeEventListener('click', this._onOutsideClick, true);
    this._resize.disconnect();
    this._templates.clear();
    clearInterval(this._tick);
  }

  /** Applies the bar-level card-mod after each render. */
  protected updated(): void {
    const cardMod = this._config?.mobile?.card_mod;
    if (cardMod) {
      applyCardMod(this, cardMod, 'dashboard-sidebar-bar');
    }
  }

  /** Recomputes how many slots the current width can hold. */
  private _measure(): void {
    const width = this.clientWidth || window.innerWidth;
    const fit = Math.max(1, Math.floor(width / MIN_SLOT_WIDTH));
    const cap = this._config?.mobile?.max_visible;
    this._capacity = cap ? Math.min(fit, cap) : fit;
  }

  /** The visible slots and the effective menu, after width folding. */
  private _layout(): { visible: BarEntry[]; menu: BarEntry[] } {
    const { slots, menu } = this._resolved;
    if (menu.length === 0 && slots.length <= this._capacity) {
      return { visible: slots, menu: [] };
    }
    const room = Math.max(1, this._capacity - 1);
    return {
      visible: slots.slice(0, room),
      menu: [...slots.slice(room), ...menu],
    };
  }

  /** Whether an entry's navigate target matches the current page. */
  private _navActive(entry: BarEntry): boolean {
    const el = entry.element as ItemBlock;
    if (el.active_highlight === false) {
      return false;
    }
    const action = el.tap_action as RunnableAction | undefined;
    if (action?.action !== 'navigate' || !action.navigation_path) {
      return false;
    }
    const target = String(action.navigation_path).split('?')[0].split('#')[0];
    return target !== '' && (this._path === target || this._path.startsWith(`${target}/`));
  }

  /** Runs an element's tap action. */
  private _run(el: ItemBlock | FooterButtonConfig): void {
    if (this._hass) {
      runAction(this, this._hass, el.tap_action as RunnableAction | undefined, el.entity);
    }
  }

  /** Handles a slot tap: categories open their flyout, others act. */
  private _onSlotTap(entry: BarEntry, ev: Event): void {
    if (entry.kind === 'category') {
      const el = entry.element as CategoryBlock;
      this._toggleFlyout(el.id ?? 'category', ev);
      return;
    }
    this._open = null;
    this._run(entry.element as ItemBlock);
  }

  /** Opens or closes a flyout anchored to the tapped slot. */
  private _toggleFlyout(key: string, ev: Event): void {
    if (this._open === key) {
      this._open = null;
      return;
    }
    const slot = ev.currentTarget as HTMLElement;
    const rect = slot.getBoundingClientRect();
    this._anchorX = rect.left + rect.width / 2;
    this._open = key;
  }

  /** The label text an entry shows, per the labels mode. */
  private _label(entry: BarEntry, active: boolean): string | undefined {
    const mode = this._config?.mobile?.labels ?? 'never';
    if (mode === 'never' || (mode === 'active' && !active)) {
      return undefined;
    }
    return this._title(entry);
  }

  /** The resolved display title of an entry. */
  private _title(entry: BarEntry): string {
    const el = entry.element as ItemBlock;
    return this._templates.resolve(el.title ?? (el as FooterButtonConfig).title);
  }

  /** Renders the icon (or initials) span shared by slots and flyout rows. */
  private _renderIcon(entry: BarEntry, caret: boolean): TemplateResult {
    const el = entry.element as ItemBlock;
    const icon = this._templates.resolve(el.icon);
    const iconColor = this._templates.resolve(el.icon_color);
    const title = this._title(entry);
    const abbr =
      el.abbr ||
      title
        .split(/\s+/)
        .map((w) => w[0] ?? '')
        .join('')
        .slice(0, 2);
    return html`
      <span class="dashboard-sidebar-bar-icon" style=${iconColor ? `color:${iconColor}` : ''}>
        ${
          icon
            ? html`<ha-icon icon=${icon}></ha-icon>`
            : html`<span class="dashboard-sidebar-bar-abbr">${abbr}</span>`
        }
        ${
          caret
            ? html`<ha-icon class="dashboard-sidebar-bar-caret" icon="mdi:chevron-up"></ha-icon>`
            : nothing
        }
      </span>
    `;
  }

  /** Renders one slot. */
  private _renderSlot(entry: BarEntry, index: number): TemplateResult {
    if (entry.kind === 'divider') {
      return html`<span class="dashboard-sidebar-bar-divider"></span>`;
    }
    const el = entry.element as ItemBlock;
    if (entry.kind === 'clock' || entry.kind === 'date') {
      const block = entry.element as ClockBlock | DateBlock;
      const locale = this._hass?.locale?.language ?? navigator.language;
      const text =
        entry.kind === 'clock'
          ? formatClock(this._now, (block as ClockBlock).format || '%H:%M', locale)
          : formatDate(this._now, (block as DateBlock).format || '', locale);
      return html`
        <button
          class="dashboard-sidebar-bar-slot dashboard-sidebar-bar-slot-${entry.kind} ${
            el.class ?? ''
          }"
          id=${el.id ?? `bar-slot-${index}`}
          @click=${() => this._run(el)}
        >
          <span class="dashboard-sidebar-bar-time">${text}</span>
        </button>
      `;
    }
    const active = this._navActive(entry);
    const label = this._label(entry, active);
    const title = this._title(entry);
    const classes = [
      'dashboard-sidebar-bar-slot',
      `dashboard-sidebar-bar-slot-${entry.kind}`,
      active ? 'dashboard-sidebar-bar-slot-active' : '',
      this._open !== null && this._open === el.id ? 'dashboard-sidebar-bar-slot-open' : '',
      el.class ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return html`
      <button
        class=${classes}
        id=${el.id ?? `bar-slot-${index}`}
        aria-label=${title || 'bar item'}
        aria-current=${active ? 'page' : nothing}
        @click=${(ev: Event) => this._onSlotTap(entry, ev)}
      >
        ${this._renderIcon(entry, entry.kind === 'category')}
        ${label ? html`<span class="dashboard-sidebar-bar-label">${label}</span>` : nothing}
      </button>
    `;
  }

  /** Renders one row of a flyout. */
  private _renderFlyoutRow(entry: BarEntry): TemplateResult {
    const el = entry.element as ItemBlock;
    const active = this._navActive(entry);
    return html`
      <button
        class="dashboard-sidebar-bar-flyout-row ${
          active ? 'dashboard-sidebar-bar-flyout-row-active' : ''
        } ${el.class ?? ''}"
        @click=${() => {
          this._open = null;
          this._run(el);
        }}
      >
        ${this._renderIcon(entry, false)}
        <span class="dashboard-sidebar-bar-flyout-label">${this._title(entry)}</span>
      </button>
    `;
  }

  /** The entries of the currently open flyout, or none. */
  private _flyoutEntries(menu: BarEntry[]): BarEntry[] | null {
    if (this._open === null) {
      return null;
    }
    if (this._open === 'menu') {
      return menu;
    }
    const source = [...this._resolved.slots, ...menu].find(
      (e) => e.kind === 'category' && (e.element as CategoryBlock).id === this._open,
    );
    if (!source) {
      return null;
    }
    return ((source.element as CategoryBlock).items ?? []).map((child) => ({
      source: 'derived',
      kind: 'item',
      element: child,
    }));
  }

  /** Renders the open flyout above its anchor. */
  private _renderFlyout(menu: BarEntry[]): TemplateResult | typeof nothing {
    const entries = this._flyoutEntries(menu);
    if (!entries || entries.length === 0) {
      return nothing;
    }
    const x = Math.round(this._anchorX);
    return html`
      <div
        class="dashboard-sidebar-bar-flyout"
        style="left: clamp(8px, calc(${x}px - var(--dashboard-sidebar-bar-flyout-width, 200px) / 2), calc(100vw - var(--dashboard-sidebar-bar-flyout-width, 200px) - 8px))"
      >
        ${entries.map((entry) => this._renderFlyoutRow(entry))}
      </div>
    `;
  }

  /** Renders the bar. */
  protected render(): TemplateResult | typeof nothing {
    const mobile = this._config?.mobile;
    if (!mobile || this._resolved.slots.length + this._resolved.menu.length === 0) {
      return nothing;
    }
    const { visible, menu } = this._layout();
    const background = mobile.background ?? this._config?.background;
    return html`
      <nav
        class="dashboard-sidebar-bar"
        data-labels=${mobile.labels ?? 'never'}
        data-overflowing=${menu.length > 0 ? 'true' : 'false'}
        style=${background ? `background:${background}` : ''}
        aria-label="Dashboard bar"
      >
        ${this._renderFlyout(menu)}
        <div class="dashboard-sidebar-bar-slots">
          ${visible.map((entry, i) => this._renderSlot(entry, i))}
          ${
            menu.length > 0
              ? html`
                  <button
                    class="dashboard-sidebar-bar-slot dashboard-sidebar-bar-slot-overflow ${
                      this._open === 'menu' ? 'dashboard-sidebar-bar-slot-open' : ''
                    }"
                    aria-label="More"
                    @click=${(ev: Event) => this._toggleFlyout('menu', ev)}
                  >
                    <span class="dashboard-sidebar-bar-icon">
                      <ha-icon icon="mdi:dots-horizontal"></ha-icon>
                    </span>
                  </button>
                `
              : nothing
          }
        </div>
      </nav>
    `;
  }
}

declare global {
  /** Registers the element's tag name for typed DOM lookups. */
  interface HTMLElementTagNameMap {
    /** The mobile bar custom element. */
    'dashboard-sidebar-bar': DashboardSidebarBar;
  }
}
