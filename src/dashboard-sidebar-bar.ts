import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { runAction, type RunnableAction } from './lib/action';
import { applyCardMod } from './lib/card-mod';
import { formatCollapsedClock, formatCollapsedDate, zonedDate } from './lib/format';
import { resolveBar, type BarEntry, type ResolvedBar } from './lib/mobile';
import { TemplateManager } from './lib/templates';
import { barStyles } from './styles/bar';
import type {
  CategoryBlock,
  DashboardSidebarConfig,
  FooterButtonConfig,
  ItemBlock,
  SidebarBlock,
} from './lib/types';
import type { HomeAssistant } from 'custom-card-helpers';

/** The display-relevant shape shared by clock and date elements. */
interface TimeElement {
  /** The clock's strftime pattern or legacy 12h/24h keyword. */
  format?: string;
  /** An optional IANA timezone. */
  timezone?: string;
  /** An optional text color, possibly a template. */
  text_color?: string;
  /** Legacy hour-format key. */
  hour_format?: string;
  /** Legacy collapsed-format key. */
  collapsed_format?: string;
}

/** The minimum width one bar slot needs before the tail folds into the menu. */
const MIN_SLOT_WIDTH = 64;

/**
 * The mobile bottom bar. Renders the resolved slots (items, categories,
 * clocks, dates, dividers) with icons, optional labels, live templates, and
 * the nav-active highlight. Footer buttons and any slots that do not fit the
 * viewport fold into a trailing dots menu, which opens a bottom sheet with
 * accordion categories and the desktop footer pinned across its bottom
 * (icon buttons, or a card/markdown footer built via the card helpers);
 * category slots on the bar open a small upward flyout. Chrome carries
 * dashboard-sidebar-bar-* classes so card-mod and themes can target every
 * part.
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
    if (this._footerCard) {
      this._footerCard.hass = value;
    }
    for (const card of this._extraCards.values()) {
      card.hass = value;
    }
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

  /** The built card element of a card/markdown footer, for the sheet. */
  @state() private _footerCard?: HTMLElement & { hass?: HomeAssistant };

  /** Built card elements for card/markdown sheet-menu entries, by index. */
  @state() private _extraCards = new Map<number, HTMLElement & { hass?: HomeAssistant }>();

  /** Ids of categories expanded inside the open sheet. */
  @state() private _expanded = new Set<string>();

  /** The current time, ticked while a clock or date slot is on the bar. */
  @state() private _now = new Date();

  /** Handle of the clock/date interval timer, when running. */
  private _timer?: number;

  /** Live template subscriptions for entry titles, icons, and colors. */
  private readonly _templates = new TemplateManager(() => this.requestUpdate());

  /** Re-measures capacity as the viewport changes. */
  private readonly _resize = new ResizeObserver(() => this._measure());

  /** Re-reads the path when the frontend navigates. */
  private readonly _onLocationChange = (): void => {
    this._path = window.location.pathname;
    this._close();
  };

  /** Closes any open flyout when a tap lands outside the bar. */
  private readonly _onOutsideClick = (ev: Event): void => {
    if (this._open !== null && !ev.composedPath().includes(this)) {
      this._close();
    }
  };

  /** Closes any open flyout or sheet and collapses the accordion. */
  private _close(): void {
    this._open = null;
    this._expanded = new Set();
  }

  /**
   * Stores the config and resolves the bar. The config is expected to be
   * validated by the caller (the bootstrap only mounts valid configs).
   */
  public setConfig(config: DashboardSidebarConfig): void {
    this._config = config;
    this._resolved = resolveBar(config);
    this.setAttribute('data-position', config.mobile?.position ?? 'bottom');
    // Collect templates from the resolved elements by presenting them to the
    // manager as a synthetic config in the shape it already understands.
    const body: SidebarBlock[] = [];
    const buttons: FooterButtonConfig[] = [];
    for (const entry of [
      ...this._resolved.slots,
      ...this._resolved.menu,
      ...this._resolved.extras,
    ]) {
      if (entry.kind === 'button') {
        buttons.push(entry.element as FooterButtonConfig);
      } else {
        body.push(entry.element as SidebarBlock);
      }
    }
    this._templates.collect({ body, footer: { ...(config.footer ?? {}), buttons } });
    this._templates.setHass(this._hass);
    this._restartTimer();
    void this._buildCards();
  }

  /** Whether the desktop footer is a card or markdown footer. */
  private _footerHasContent(): boolean {
    const footer = this._config?.footer;
    return footer !== undefined && (footer.card !== undefined || footer.markdown !== undefined);
  }

  /**
   * Instantiates card elements for a card/markdown footer and for card and
   * markdown sheet-menu entries via Home Assistant's card helpers, mirroring
   * the desktop sidebar's card pipeline.
   */
  private async _buildCards(): Promise<void> {
    const footer = this._config?.footer;
    const extraSpecs = new Map<number, unknown>();
    this._resolved.extras.forEach((entry, i) => {
      if (entry.kind === 'card') {
        extraSpecs.set(i, (entry.element as { card?: unknown }).card);
      } else if (entry.kind === 'markdown') {
        extraSpecs.set(i, {
          type: 'markdown',
          content: (entry.element as { content?: string }).content,
        });
      }
    });
    if (!this._footerHasContent() && extraSpecs.size === 0) {
      this._footerCard = undefined;
      this._extraCards = new Map();
      return;
    }
    const helpers = await (
      window as unknown as {
        loadCardHelpers?: () => Promise<{
          createCardElement: (cfg: unknown) => HTMLElement & { hass?: HomeAssistant };
        }>;
      }
    ).loadCardHelpers?.();
    if (!helpers) {
      return;
    }
    const make = (spec: unknown): HTMLElement & { hass?: HomeAssistant } => {
      const cardConfig = typeof spec === 'string' ? { type: 'markdown', content: spec } : spec;
      const el = helpers.createCardElement(cardConfig);
      el.hass = this._hass;
      return el;
    };
    if (this._footerHasContent()) {
      const spec =
        footer?.card !== undefined
          ? footer.card
          : { type: 'markdown', content: footer?.markdown as string };
      this._footerCard = make(spec);
    } else {
      this._footerCard = undefined;
    }
    const extras = new Map<number, HTMLElement & { hass?: HomeAssistant }>();
    for (const [i, spec] of extraSpecs) {
      extras.set(i, make(spec));
    }
    this._extraCards = extras;
  }

  /**
   * Restarts the clock/date timer: every second when a clock is on the bar,
   * every minute for dates alone, stopped when neither is present.
   */
  private _restartTimer(): void {
    window.clearInterval(this._timer);
    this._timer = undefined;
    const kinds = new Set(this._resolved.slots.map((e) => e.kind));
    if (!kinds.has('clock') && !kinds.has('date')) {
      return;
    }
    this._now = new Date();
    this._timer = window.setInterval(
      () => {
        this._now = new Date();
      },
      kinds.has('clock') ? 1000 : 60000,
    );
  }

  /** Subscribes to navigation, resize, and outside taps while connected. */
  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('location-changed', this._onLocationChange);
    window.addEventListener('click', this._onOutsideClick, true);
    this._resize.observe(this);
    this._measure();
    this._restartTimer();
  }

  /** Unsubscribes on disconnect. */
  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocationChange);
    window.removeEventListener('click', this._onOutsideClick, true);
    this._resize.disconnect();
    this._templates.clear();
    window.clearInterval(this._timer);
    this._timer = undefined;
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
    this._capacity = Math.max(1, Math.floor(width / MIN_SLOT_WIDTH));
  }

  /** The visible slots and the effective menu, after width folding. */
  private _layout(): { visible: BarEntry[]; menu: BarEntry[] } {
    const { slots, menu } = this._resolved;
    if (
      menu.length === 0 &&
      this._resolved.extras.length === 0 &&
      !this._footerHasContent() &&
      slots.length <= this._capacity
    ) {
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
    const target = String(action.navigation_path).split(/[?#]/)[0].replace(/\/+$/, '');
    const current = this._path.replace(/\/+$/, '');
    return target !== '' && (current === target || current.startsWith(`${target}/`));
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
    this._close();
    this._run(entry.element as ItemBlock);
  }

  /** Opens or closes a flyout anchored to the tapped slot. */
  private _toggleFlyout(key: string, ev: Event): void {
    if (this._open === key) {
      this._close();
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

  /**
   * The compact time or date text of a clock/date entry, matching the desktop
   * sidebar's collapsed format (including the legacy hour-format keys).
   */
  private _timeText(entry: BarEntry): string {
    const el = entry.element as TimeElement;
    const now = zonedDate(this._now, el.timezone ?? '');
    if (entry.kind === 'date') {
      return formatCollapsedDate(now);
    }
    const raw = typeof el.format === 'string' ? el.format.trim() : '';
    let twelve: boolean;
    if (raw !== '' && raw !== '12h' && raw !== '24h') {
      twelve = /%-?[Il]|%p|%P/.test(raw);
    } else {
      const hour =
        raw === '12h' || raw === '24h' ? raw : (el.hour_format ?? el.collapsed_format ?? '24h');
      twelve = hour === '12h';
    }
    return formatCollapsedClock(now, twelve);
  }

  /** Renders the icon (or initials) span shared by slots and flyout rows. */
  private _renderIcon(entry: BarEntry): TemplateResult {
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
      </span>
    `;
  }

  /** Renders one slot. */
  private _renderSlot(entry: BarEntry, index: number): TemplateResult {
    if (entry.kind === 'divider') {
      return html`<span class="dashboard-sidebar-bar-divider"></span>`;
    }
    const el = entry.element as ItemBlock;
    const time = entry.kind === 'clock' || entry.kind === 'date';
    const active = this._navActive(entry);
    const label = time ? undefined : this._label(entry, active);
    const title = this._title(entry);
    const textColor = time
      ? this._templates.resolve((entry.element as TimeElement).text_color)
      : '';
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
        aria-label=${title || (time ? entry.kind : 'bar item')}
        aria-current=${active ? 'page' : nothing}
        style=${textColor ? `color:${textColor}` : ''}
        @click=${(ev: Event) => this._onSlotTap(entry, ev)}
      >
        ${
          time
            ? html`<span class="dashboard-sidebar-bar-time">${this._timeText(entry)}</span>`
            : this._renderIcon(entry)
        }
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
          this._close();
          this._run(el);
        }}
      >
        ${entry.kind === 'clock' || entry.kind === 'date' ? nothing : this._renderIcon(entry)}
        <span class="dashboard-sidebar-bar-flyout-label">
          ${
            entry.kind === 'clock' || entry.kind === 'date'
              ? this._timeText(entry)
              : this._title(entry)
          }
        </span>
      </button>
    `;
  }

  /** The entries of the currently open category flyout, or none. */
  private _flyoutEntries(menu: BarEntry[]): BarEntry[] | null {
    if (this._open === null || this._open === 'menu') {
      return null;
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

  /** Toggles a category's accordion expansion inside the sheet. */
  private _toggleExpand(id: string): void {
    const next = new Set(this._expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this._expanded = next;
  }

  /** Renders one list row of the sheet (items, times, dividers, accordions). */
  private _renderSheetRow(entry: BarEntry): TemplateResult {
    if (entry.kind === 'divider') {
      return html`<span class="dashboard-sidebar-bar-sheet-divider"></span>`;
    }
    if (entry.kind === 'clock' || entry.kind === 'date') {
      return html`
        <div class="dashboard-sidebar-bar-sheet-row dashboard-sidebar-bar-sheet-time">
          ${this._timeText(entry)}
        </div>
      `;
    }
    if (entry.kind === 'category') {
      const el = entry.element as CategoryBlock;
      const id = el.id ?? '';
      const expanded = this._expanded.has(id);
      const children: BarEntry[] = (el.items ?? []).map((child) => ({
        source: entry.source,
        kind: 'item',
        element: child,
      }));
      return html`
        <button
          class="dashboard-sidebar-bar-sheet-row dashboard-sidebar-bar-sheet-category ${el.class ?? ''}"
          aria-expanded=${expanded ? 'true' : 'false'}
          @click=${() => this._toggleExpand(id)}
        >
          ${this._renderIcon(entry)}
          <span class="dashboard-sidebar-bar-sheet-label">${this._title(entry)}</span>
          <ha-icon
            class="dashboard-sidebar-bar-sheet-chevron ${expanded ? 'open' : ''}"
            icon="mdi:chevron-down"
          ></ha-icon>
        </button>
        ${
          expanded
            ? html`
                <div class="dashboard-sidebar-bar-sheet-children">
                  ${children.map((child) => this._renderSheetRow(child))}
                </div>
              `
            : nothing
        }
      `;
    }
    const el = entry.element as ItemBlock;
    const active = this._navActive(entry);
    return html`
      <button
        class="dashboard-sidebar-bar-sheet-row ${
          active ? 'dashboard-sidebar-bar-sheet-row-active' : ''
        } ${el.class ?? ''}"
        aria-current=${active ? 'page' : nothing}
        @click=${() => {
          this._close();
          this._run(el);
        }}
      >
        ${this._renderIcon(entry)}
        <span class="dashboard-sidebar-bar-sheet-label">${this._title(entry)}</span>
      </button>
    `;
  }

  /** Renders one footer button of the sheet. */
  private _renderSheetButton(entry: BarEntry): TemplateResult {
    const el = entry.element as FooterButtonConfig;
    const active = this._navActive(entry);
    return html`
      <button
        class="dashboard-sidebar-bar-sheet-footer-btn ${
          active ? 'dashboard-sidebar-bar-sheet-row-active' : ''
        } ${el.class ?? ''}"
        aria-label=${this._title(entry) || 'footer button'}
        @click=${() => {
          this._close();
          this._run(el);
        }}
      >
        ${this._renderIcon(entry)}
      </button>
    `;
  }

  /**
   * Renders a card/markdown footer inside the sheet footer, with the desktop
   * footer's chrome-less treatment, markdown color, and tap action.
   */
  private _renderSheetFooterContent(): TemplateResult | typeof nothing {
    const footer = this._config?.footer;
    const el = this._footerCard;
    if (!footer || !el) {
      return nothing;
    }
    const markdown = footer.markdown !== undefined;
    const mdColor =
      markdown && footer.markdown_color ? this._templates.resolve(footer.markdown_color) : '';
    const chromeless = markdown || typeof footer.card === 'string';
    const style = [
      chromeless
        ? '--ha-card-background:transparent;--ha-card-box-shadow:none;--ha-card-border-width:0px'
        : '',
      mdColor ? `color:${mdColor};--primary-text-color:${mdColor}` : '',
    ]
      .filter(Boolean)
      .join(';');
    const action = markdown ? (footer.tap_action as RunnableAction | undefined) : undefined;
    return html`
      <div
        class="dashboard-sidebar-bar-sheet-footer-content ${action ? 'clickable' : ''}"
        style=${style}
        @click=${
          action
            ? () => {
                this._close();
                if (this._hass) {
                  runAction(this, this._hass, action, undefined);
                }
              }
            : nothing
        }
      >
        ${el}
      </div>
    `;
  }

  /** Renders one curated sheet-menu entry: titles and cards get their own
   * treatments, everything else renders as a normal sheet row. */
  private _renderSheetExtra(entry: BarEntry, index: number): TemplateResult | typeof nothing {
    if (entry.kind === 'title') {
      const el = entry.element as {
        text?: string;
        align?: string;
        text_color?: string;
        tap_action?: unknown;
      };
      const color = this._templates.resolve(el.text_color);
      const style = [el.align ? `text-align:${el.align}` : '', color ? `color:${color}` : '']
        .filter(Boolean)
        .join(';');
      return html`
        <div
          class="dashboard-sidebar-bar-sheet-title ${el.tap_action ? 'clickable' : ''}"
          style=${style}
          @click=${
            el.tap_action
              ? () => {
                  this._close();
                  this._run(entry.element as ItemBlock);
                }
              : nothing
          }
        >
          ${this._templates.resolve(el.text)}
        </div>
      `;
    }
    if (entry.kind === 'card' || entry.kind === 'markdown') {
      const card = this._extraCards.get(index);
      if (!card) {
        return nothing;
      }
      const el = entry.element as { text_color?: string; card?: unknown };
      const chromeless = entry.kind === 'markdown' || typeof el.card === 'string';
      const color = entry.kind === 'markdown' ? this._templates.resolve(el.text_color) : '';
      const style = [
        chromeless
          ? '--ha-card-background:transparent;--ha-card-box-shadow:none;--ha-card-border-width:0px'
          : '',
        color ? `color:${color};--primary-text-color:${color}` : '',
      ]
        .filter(Boolean)
        .join(';');
      return html` <div class="dashboard-sidebar-bar-sheet-card" style=${style}>${card}</div> `;
    }
    return this._renderSheetRow(entry);
  }

  /** Renders the bottom sheet holding the dots-menu entries. */
  private _renderSheet(menu: BarEntry[]): TemplateResult | typeof nothing {
    const content = this._renderSheetFooterContent();
    const extras = this._resolved.extras;
    if (
      this._open !== 'menu' ||
      (menu.length === 0 && extras.length === 0 && content === nothing)
    ) {
      return nothing;
    }
    const buttons = content === nothing ? menu.filter((e) => e.kind === 'button') : [];
    const rows = menu.filter((e) => e.kind !== 'button');
    return html`
      <div class="dashboard-sidebar-bar-sheet-scrim" @click=${() => this._close()}></div>
      <div
        class="dashboard-sidebar-bar-sheet"
        role="menu"
        aria-label="More"
        style=${this._config?.background ? `background:${this._config.background}` : ''}
      >
        ${
          rows.length > 0 || extras.length > 0
            ? html`
                <div class="dashboard-sidebar-bar-sheet-rows">
                  ${rows.map((entry) => this._renderSheetRow(entry))}
                  ${extras.map((entry, i) => this._renderSheetExtra(entry, i))}
                </div>
              `
            : nothing
        }
        ${
          buttons.length > 0 || content !== nothing
            ? html`
                <div
                  class="dashboard-sidebar-bar-sheet-footer ${
                    this._config?.footer?.divider === false ? 'no-divider' : ''
                  }"
                >
                  ${content !== nothing ? content : buttons.map((entry) => this._renderSheetButton(entry))}
                </div>
              `
            : nothing
        }
      </div>
    `;
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
        ${this._renderSheet(menu)} ${this._renderFlyout(menu)}
        <div class="dashboard-sidebar-bar-slots">
          ${visible.map((entry, i) => this._renderSlot(entry, i))}
          ${
            menu.length > 0 || this._resolved.extras.length > 0 || this._footerHasContent()
              ? html`
                  <button
                    class="dashboard-sidebar-bar-slot dashboard-sidebar-bar-slot-overflow ${
                      this._open === 'menu' ? 'dashboard-sidebar-bar-slot-open' : ''
                    }"
                    aria-label="More"
                    aria-expanded=${this._open === 'menu' ? 'true' : 'false'}
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
