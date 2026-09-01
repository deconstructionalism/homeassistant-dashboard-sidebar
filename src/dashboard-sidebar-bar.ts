import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { runAction, type RunnableAction } from './lib/action';
import Sortable from 'sortablejs';

import { tick } from './lib/debug';

import { EDIT_EVENT, PREVIEW_REORDER_EVENT, PREVIEW_SELECT_EVENT } from './lib/const';
import { applyCardMod } from './lib/card-mod';
import { formatCollapsedClock, formatCollapsedDate, zonedDate } from './lib/format';
import { mobileMode, resolveBar, type BarEntry, type ResolvedBar } from './lib/mobile';
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

  /**
   * Editor preview mode: the bar renders in flow inside a frame instead of
   * fixed to the viewport, and tap actions do not fire (the sheet and
   * flyouts still open, so the editor can demonstrate them).
   */
  @property({ type: Boolean, reflect: true })
  public preview = false;

  /** Whether the dashboard is in edit mode, showing the edit pencil. */
  @property({ attribute: false })
  public editMode = false;

  /**
   * Editor preview interactivity: clicks select elements for editing and the
   * slots, menu rows, and footer strip become drag-reorderable. Only
   * meaningful together with `preview`.
   */
  @property({ attribute: false })
  public previewInteractive = false;

  /** The data-loc of the element selected in the editor, for highlighting. */
  @property({ attribute: false })
  public previewSelected?: string;

  /** Forces the sheet open (the editor's Menu sub-tab). */
  @property({ attribute: false })
  public previewSheetOpen = false;

  /** Preview containers already wired for drag-and-drop. */
  private readonly _sortables = new WeakSet<HTMLElement>();

  /** The dragged node's origin, for reverting Sortable's DOM move. */
  private _dragOrigin?: { parent: Node; next: Node | null };

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
  @state() private _resolved: ResolvedBar = { slots: [], menu: [], extras: [], footer: [] };

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

  /** Whether the sheet is playing its slide-out before unmounting. */
  @state() private _sheetClosing = false;

  /** Whether the mounted sheet is in its slid-in position (transition end). */
  @state() private _sheetShown = false;

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

  /** Closes any open flyout when a tap lands outside the bar. Inert in the
   * editor preview, where clicks on the form should not collapse the sheet. */
  private readonly _onOutsideClick = (ev: Event): void => {
    if (!this.preview && this._open !== null && !ev.composedPath().includes(this)) {
      this._close();
    }
  };

  /** Closes any open flyout or sheet and collapses the accordion. */
  private _close(): void {
    if (this._open === 'menu') {
      // Keep the sheet mounted while it slides back behind the bar; the
      // timeout backstops reduced-motion, where transitionend never fires.
      this._sheetClosing = true;
      this._sheetShown = false;
      window.setTimeout(() => {
        this._sheetClosing = false;
      }, 400);
    }
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
      ...this._resolved.footer,
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

  /** Applies the editor's sheet-open request when it changes; the dots slot
   * can still toggle the sheet in between. */
  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('previewSheetOpen') && this.preview && this.previewInteractive) {
      this._open = this.previewSheetOpen ? 'menu' : null;
      this._sheetClosing = false;
    }
  }

  /** Applies the bar-level card-mod and preview drag wiring after render. */
  protected updated(): void {
    tick('bar-updated');
    const cardMod = this._config?.mobile?.card_mod;
    if (cardMod) {
      applyCardMod(this, cardMod, 'dashboard-sidebar-bar');
    }
    this._wirePreviewSort();
  }

  /**
   * In an interactive preview, wires drag-and-drop onto the slot row, the
   * sheet's menu rows, and the sheet's footer strip, dispatching container
   * names and indices for the editor to apply (indices map 1:1 to the config
   * lists because folding is disabled and placeholders render).
   */
  private _wirePreviewSort(): void {
    if (!this.preview || !this.previewInteractive) {
      return;
    }
    const accepts: Record<string, string[] | null> = {
      items: ['item', 'category', 'divider', 'clock', 'date', 'button'],
      'items-overflow': ['item', 'category', 'divider', 'clock', 'date', 'button'],
      menu: null, // anything
      footer: ['item', 'button'],
    };
    const root = this.renderRoot as ParentNode;
    root.querySelectorAll<HTMLElement>('[data-container]').forEach((el) => {
      if (this._sortables.has(el)) {
        return;
      }
      this._sortables.add(el);
      Sortable.create(el, {
        group: {
          name: 'sb-bar',
          put: (to, _from, dragEl) => {
            const target = (to.el as HTMLElement).dataset.container ?? '';
            if (target.startsWith('cat:')) {
              return false; // children reorder internally; nothing drops in
            }
            const allowed = accepts[target];
            if (allowed === undefined) {
              return false;
            }
            if (allowed === null) {
              return true;
            }
            return allowed.includes(dragEl.getAttribute('data-kind') ?? '');
          },
        },
        // Default draggable (direct children), like the desktop preview: an
        // explicit descendant selector confuses nested closest() resolution
        // and breaks dragging children out of categories. Chrome-of-drag is
        // excluded via filter; positions travel as data-locs, so extra
        // non-entry children cost nothing.
        filter: '.dashboard-sidebar-bar-slot-overflow, .dashboard-sidebar-bar-edit',
        animation: 150,
        // Pointer-emulation mode: native HTML5 drag is unreliable across
        // nested shadow-DOM lists, while the fallback pierces shadow roots
        // during target detection and behaves identically everywhere.
        forceFallback: true,
        fallbackOnBody: true,
        // Require a little movement before a fallback drag engages, so plain
        // taps stay clicks (fallback swallows the click after any drag).
        fallbackTolerance: 4,
        onStart: (evt) => {
          this._dragOrigin = { parent: evt.from, next: evt.item.nextSibling };
        },
        onEnd: (evt) => {
          // Capture the drop position, then revert Sortable's DOM surgery:
          // Lit does not own a foreign node, so the moved element would keep
          // its origin rendering (a sheet row on the bar, say). The config
          // update re-renders the proper element in the new place instead.
          const restore = (): void => {
            if (this._dragOrigin) {
              this._dragOrigin.parent.insertBefore(evt.item, this._dragOrigin.next);
              this._dragOrigin = undefined;
            }
          };
          const fromC = evt.from.getAttribute('data-container') ?? '';
          const toC = evt.to.getAttribute('data-container') ?? '';
          // The bar's items list renders split across the bar and the sheet's
          // overflow, so moves are described by element locs, not container
          // indices: the dragged entry's loc plus the loc it now precedes.
          const norm = (c: string): string => (c === 'items-overflow' ? 'items' : c);
          const srcLoc = evt.item.getAttribute('data-loc');
          if (!srcLoc) {
            restore();
            return;
          }
          let sibling = evt.item.nextElementSibling;
          while (sibling && !sibling.hasAttribute('data-loc')) {
            sibling = sibling.nextElementSibling;
          }
          let beforeLoc = sibling?.getAttribute('data-loc') ?? null;
          if (beforeLoc === null && toC === 'items') {
            // Dropped at the end of the visible bar: the fold continues in
            // the sheet, so the true position is before the first folded row.
            beforeLoc =
              (this.renderRoot as ParentNode)
                .querySelector('[data-container="items-overflow"] [data-loc]')
                ?.getAttribute('data-loc') ?? null;
          }
          restore();
          this.dispatchEvent(
            new CustomEvent(PREVIEW_REORDER_EVENT, {
              detail: { from: norm(fromC), to: norm(toC), srcLoc, beforeLoc },
              bubbles: true,
              composed: true,
            }),
          );
        },
      });
    });
  }

  /** Dispatches an element selection to the editor. */
  private _selectPreview(loc: string): void {
    this.dispatchEvent(
      new CustomEvent(PREVIEW_SELECT_EVENT, {
        detail: { loc },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** The ` sb-selected` class suffix for the selected preview element. */
  private _selClass(loc: string | null): string {
    return loc !== null && this.preview && this.previewSelected === loc ? ' sb-selected' : '';
  }

  /** Recomputes how many slots the current width can hold. */
  private _measure(): void {
    tick('bar-measure');
    const width = this.clientWidth || window.innerWidth;
    this._capacity = Math.max(1, Math.floor(width / MIN_SLOT_WIDTH));
  }

  /** The visible slots and the effective menu, after width folding. */
  private _layout(): { visible: BarEntry[]; menu: BarEntry[] } {
    const { slots, menu } = this._resolved;
    if (
      menu.length === 0 &&
      this._resolved.extras.length === 0 &&
      this._resolved.footer.length === 0 &&
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

  /** Runs an element's tap action. Inert in editor preview. */
  private _run(el: ItemBlock | FooterButtonConfig): void {
    if (this.preview) {
      return;
    }
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
    this._sheetClosing = false;
    if (key === 'menu' && this.preview) {
      // The in-flow preview sheet grows the frame; tell the editor so it can
      // scroll its own container (scrollIntoView would also scroll the modal
      // and the page behind it).
      void this.updateComplete.then(() => {
        requestAnimationFrame(() => {
          this.dispatchEvent(
            new CustomEvent('bar-preview-sheet-open', { bubbles: true, composed: true }),
          );
        });
      });
    }
    if (key === 'menu') {
      // The sheet mounts in its tucked-away position; flipping the class a
      // frame later runs the slide as a transition, which (unlike shadow-DOM
      // keyframes) animates reliably on WebKit.
      this._sheetShown = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this._open === 'menu') {
            this._sheetShown = true;
          }
        });
      });
    }
  }

  /** The label text an entry shows, when labels are enabled. */
  private _label(entry: BarEntry): string | undefined {
    return this._config?.mobile?.labels ? this._title(entry) : undefined;
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
      const dloc =
        this.preview && this.previewInteractive && entry.srcIndex !== undefined
          ? `items:${entry.srcIndex}`
          : null;
      return html`<span
        class="dashboard-sidebar-bar-divider${this._selClass(dloc)}"
        data-loc=${dloc ?? nothing}
        data-drag=${dloc ?? nothing}
        data-kind=${dloc !== null ? 'divider' : nothing}
        @click=${dloc !== null ? () => this._selectPreview(dloc) : nothing}
      ></span>`;
    }
    const el = entry.element as ItemBlock;
    const interactive = this.preview && this.previewInteractive;
    const loc = interactive && entry.srcIndex !== undefined ? `items:${entry.srcIndex}` : null;
    const time = entry.kind === 'clock' || entry.kind === 'date';
    const active = this._navActive(entry);
    const label = time ? undefined : this._label(entry);
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
      .join(' ')
      .concat(this._selClass(loc));
    return html`
      <button
        class=${classes}
        id=${el.id ?? `bar-slot-${index}`}
        aria-label=${title || (time ? entry.kind : 'bar item')}
        aria-current=${active ? 'page' : nothing}
        style=${textColor ? `color:${textColor}` : ''}
        data-loc=${loc ?? nothing}
        data-drag=${loc ?? nothing}
        data-kind=${loc !== null ? entry.kind : nothing}
        @click=${(ev: Event) => {
          if (loc !== null) {
            ev.stopPropagation();
            this._selectPreview(loc);
            return;
          }
          this._onSlotTap(entry, ev);
        }}
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

  /** Renders one list row of the sheet (items, times, dividers, accordions).
   * `hostLoc` is the entry's own loc in an interactive preview, letting a
   * category's children container register for drag-reordering. */
  private _renderSheetRow(entry: BarEntry, hostLoc: string | null = null): TemplateResult {
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
                <div
                  class="dashboard-sidebar-bar-sheet-children"
                  data-container=${
                    this.preview && this.previewInteractive && hostLoc !== null
                      ? `cat:${hostLoc}`
                      : nothing
                  }
                >
                  ${children.map((child, ci) =>
                    this.preview && this.previewInteractive && hostLoc !== null
                      ? html`<div
                          class="dashboard-sidebar-bar-sheet-editwrap"
                          data-drag="child"
                          data-kind="item"
                          data-loc=${`cat:${hostLoc}:${ci}`}
                        >
                          ${this._renderSheetRow(child)}
                        </div>`
                      : this._renderSheetRow(child),
                  )}
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
    const loc =
      this.preview && this.previewInteractive && entry.srcIndex !== undefined
        ? `footer:${entry.srcIndex}`
        : null;
    return html`
      <button
        class="dashboard-sidebar-bar-sheet-footer-btn ${
          active ? 'dashboard-sidebar-bar-sheet-row-active' : ''
        } ${el.class ?? ''}${this._selClass(loc)}"
        aria-label=${this._title(entry) || 'footer button'}
        data-loc=${loc ?? nothing}
        data-drag=${loc ?? nothing}
        data-kind=${loc !== null ? entry.kind : nothing}
        @click=${(ev: Event) => {
          if (loc !== null) {
            ev.stopPropagation();
            this._selectPreview(loc);
            return;
          }
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
   * treatments, everything else renders as a normal sheet row. In an
   * interactive preview each entry wraps with its data-loc and selects on
   * click instead of acting. */
  private _renderSheetExtra(entry: BarEntry, index: number): TemplateResult | typeof nothing {
    if (this.preview && this.previewInteractive) {
      const loc = `menu:${entry.srcIndex ?? index}`;
      return html`
        <div
          class="dashboard-sidebar-bar-sheet-editwrap${this._selClass(loc)}"
          data-loc=${loc}
          data-drag=${loc}
          data-kind=${entry.kind}
          @click=${(ev: Event) => {
            ev.stopPropagation();
            this._selectPreview(loc);
          }}
        >
          ${this._renderSheetExtraInner(entry, index)}
        </div>
      `;
    }
    return this._renderSheetExtraInner(entry, index);
  }

  /** The uninstrumented rendering of one curated sheet-menu entry. */
  private _renderSheetExtraInner(entry: BarEntry, index: number): TemplateResult | typeof nothing {
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
    return this._renderSheetRow(
      entry,
      entry.srcIndex !== undefined ? `menu:${entry.srcIndex}` : null,
    );
  }

  /** Renders the bottom sheet holding the dots-menu entries. */
  private _renderSheet(menu: BarEntry[]): TemplateResult | typeof nothing {
    const content = this._renderSheetFooterContent();
    const extras = this._resolved.extras;
    const shown = this._open === 'menu' || this._sheetClosing;
    // An interactive preview renders the sheet even when empty: it is the
    // editing surface for the menu and footer lists.
    if (
      !shown ||
      (!(this.preview && this.previewInteractive) &&
        menu.length === 0 &&
        extras.length === 0 &&
        this._resolved.footer.length === 0 &&
        content === nothing)
    ) {
      return nothing;
    }
    const closing =
      (this._sheetClosing ? ' closing' : '') +
      (this._sheetShown && this._open === 'menu' ? ' open' : '');
    const curated = this._resolved.footer;
    const shownContent = curated.length > 0 ? nothing : content;
    const buttons =
      curated.length > 0
        ? curated
        : shownContent === nothing
          ? menu.filter((e) => e.kind === 'button')
          : [];
    const rows = menu.filter((e) => e.kind !== 'button');
    return html`
      <div class="dashboard-sidebar-bar-sheet-scrim${closing}" @click=${() => this._close()}></div>
      <div
        class="dashboard-sidebar-bar-sheet${closing}"
        role="menu"
        aria-label="More"
        style=${this._config?.background ? `background:${this._config.background}` : ''}
        @transitionend=${() => {
          if (this._sheetClosing) {
            this._sheetClosing = false;
          }
        }}
      >
        ${
          rows.length > 0 || extras.length > 0 || (this.preview && this.previewInteractive)
            ? html`
                <div class="dashboard-sidebar-bar-sheet-rows">
                  <div
                    class="dashboard-sidebar-bar-sheet-rowgroup"
                    data-container=${
                      this.preview && this.previewInteractive ? 'items-overflow' : nothing
                    }
                  >
                    ${rows.map((entry) => {
                      const rloc =
                        this.preview && this.previewInteractive && entry.srcIndex !== undefined
                          ? `items:${entry.srcIndex}`
                          : null;
                      return rloc !== null
                        ? html`<div
                            class="dashboard-sidebar-bar-sheet-editwrap${this._selClass(rloc)}"
                            data-loc=${rloc}
                            data-drag=${rloc}
                            data-kind=${entry.kind}
                            @click=${(ev: Event) => {
                              ev.stopPropagation();
                              this._selectPreview(rloc);
                            }}
                          >
                            ${this._renderSheetRow(entry, rloc)}
                          </div>`
                        : this._renderSheetRow(entry);
                    })}
                  </div>
                  <div
                    class="dashboard-sidebar-bar-sheet-rowgroup"
                    data-container=${this.preview && this.previewInteractive ? 'menu' : nothing}
                  >
                    ${extras.map((entry, i) => this._renderSheetExtra(entry, i))}
                  </div>
                </div>
              `
            : nothing
        }
        ${
          buttons.length > 0 || content !== nothing || (this.preview && this.previewInteractive)
            ? html`
                <div
                  class="dashboard-sidebar-bar-sheet-footer ${
                    this._config?.footer?.divider === false ? 'no-divider' : ''
                  }"
                  data-container=${this.preview && this.previewInteractive ? 'footer' : nothing}
                >
                  ${
                    shownContent !== nothing
                      ? shownContent
                      : buttons.map((entry) => this._renderSheetButton(entry))
                  }
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
    const mobile =
      this._config && mobileMode(this._config) === 'bar' ? (this._config.mobile ?? {}) : undefined;
    if (!mobile || this._resolved.slots.length + this._resolved.menu.length === 0) {
      return nothing;
    }
    const { visible, menu } = this._layout();
    const background = mobile.background ?? this._config?.background;
    return html`
      ${this._renderSheet(menu)}
      <nav
        class="dashboard-sidebar-bar"
        data-labels=${mobile.labels ? 'true' : 'false'}
        data-overflowing=${menu.length > 0 ? 'true' : 'false'}
        style=${background ? `background:${background}` : ''}
        aria-label="Dashboard bar"
      >
        ${this._renderFlyout(menu)}
        ${
          this.editMode && !this.preview
            ? html`<button
                class="dashboard-sidebar-bar-edit"
                title="Edit sidebar"
                @click=${() => {
                  this.dispatchEvent(
                    new CustomEvent(EDIT_EVENT, { bubbles: true, composed: true }),
                  );
                }}
              >
                <ha-icon icon="mdi:pencil"></ha-icon>
              </button>`
            : nothing
        }
        <div
          class="dashboard-sidebar-bar-slots"
          data-container=${this.preview && this.previewInteractive ? 'items' : nothing}
        >
          ${visible.map((entry, i) => this._renderSlot(entry, i))}
          ${
            menu.length > 0 ||
            this._resolved.extras.length > 0 ||
            this._resolved.footer.length > 0 ||
            this._footerHasContent()
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
