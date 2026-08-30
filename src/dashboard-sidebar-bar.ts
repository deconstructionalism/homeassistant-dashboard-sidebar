import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { runAction, type RunnableAction } from './lib/action';
import { applyCardMod } from './lib/card-mod';
import { resolveBar, type BarEntry } from './lib/mobile';
import { TemplateManager } from './lib/templates';
import { barStyles } from './styles/bar';
import type {
  DashboardSidebarConfig,
  FooterButtonConfig,
  ItemBlock,
  SidebarBlock,
} from './lib/types';
import type { HomeAssistant } from 'custom-card-helpers';

/**
 * The mobile bottom bar. Renders the resolved bar entries as tappable slots
 * with icons, optional labels, and nav-active highlighting. Categories and
 * overflow render as plain slots in this skeleton; their upward flyouts come
 * next. Chrome carries dashboard-sidebar-bar-* classes throughout so card-mod
 * and themes can target every part.
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

  /** The resolved bar entries, recomputed on config change. */
  @state() private _entries: BarEntry[] = [];

  /** The current location path, tracked for the active highlight. */
  @state() private _path = window.location.pathname;

  /** Live template subscriptions for entry titles, icons, and colors. */
  private readonly _templates = new TemplateManager(() => this.requestUpdate());

  /** Re-reads the path when the frontend navigates. */
  private readonly _onLocationChange = (): void => {
    this._path = window.location.pathname;
  };

  /**
   * Stores the config and resolves the bar. The config is expected to be
   * validated by the caller (the bootstrap only mounts valid configs).
   */
  public setConfig(config: DashboardSidebarConfig): void {
    this._config = config;
    this._entries = resolveBar(config);
    // Collect templates from the resolved elements by presenting them to the
    // manager as a synthetic config in the shape it already understands.
    const body: SidebarBlock[] = [];
    const buttons: FooterButtonConfig[] = [];
    for (const entry of this._entries) {
      if (entry.kind === 'button') {
        buttons.push(entry.element as FooterButtonConfig);
      } else {
        body.push(entry.element as SidebarBlock);
      }
    }
    this._templates.collect({ body, footer: { buttons } });
    this._templates.setHass(this._hass);
  }

  /** Subscribes to navigation while connected. */
  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('location-changed', this._onLocationChange);
  }

  /** Unsubscribes on disconnect. */
  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocationChange);
    this._templates.clear();
  }

  /** Applies the bar-level card-mod after each render. */
  protected updated(): void {
    const cardMod = this._config?.mobile?.card_mod;
    if (cardMod) {
      applyCardMod(this, cardMod, 'dashboard-sidebar-bar');
    }
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

  /** Runs an entry's tap action. */
  private _onTap(entry: BarEntry): void {
    if (!this._hass) {
      return;
    }
    const el = entry.element as ItemBlock;
    runAction(this, this._hass, el.tap_action as RunnableAction | undefined, el.entity);
  }

  /** The label text an entry shows, per the labels mode. */
  private _label(entry: BarEntry, active: boolean): string | undefined {
    const mode = this._config?.mobile?.labels ?? 'never';
    if (mode === 'never' || (mode === 'active' && !active)) {
      return undefined;
    }
    const el = entry.element as ItemBlock;
    return this._templates.resolve(el.title ?? (el as FooterButtonConfig).title);
  }

  /** Renders one slot. */
  private _renderSlot(entry: BarEntry, index: number): TemplateResult {
    const el = entry.element as ItemBlock;
    const active = this._navActive(entry);
    const icon = this._templates.resolve(el.icon);
    const label = this._label(entry, active);
    const classes = [
      'dashboard-sidebar-bar-slot',
      `dashboard-sidebar-bar-slot-${entry.kind}`,
      active ? 'dashboard-sidebar-bar-slot-active' : '',
      el.class ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    const iconColor = this._templates.resolve(el.icon_color);
    const title = this._templates.resolve(el.title ?? (el as FooterButtonConfig).title);
    const abbr =
      (el as ItemBlock).abbr ||
      title
        .split(/\s+/)
        .map((w) => w[0] ?? '')
        .join('')
        .slice(0, 2);
    return html`
      <button
        class=${classes}
        id=${el.id ?? `bar-slot-${index}`}
        aria-label=${title || 'bar item'}
        aria-current=${active ? 'page' : nothing}
        @click=${() => this._onTap(entry)}
      >
        <span class="dashboard-sidebar-bar-icon" style=${iconColor ? `color:${iconColor}` : ''}>
          ${
            icon
              ? html`<ha-icon icon=${icon}></ha-icon>`
              : html`<span class="dashboard-sidebar-bar-abbr">${abbr}</span>`
          }
          ${
            entry.kind === 'category'
              ? html`<ha-icon class="dashboard-sidebar-bar-caret" icon="mdi:chevron-up"></ha-icon>`
              : nothing
          }
        </span>
        ${label ? html`<span class="dashboard-sidebar-bar-label">${label}</span>` : nothing}
      </button>
    `;
  }

  /** Renders the bar. */
  protected render(): TemplateResult | typeof nothing {
    const mobile = this._config?.mobile;
    if (!mobile || this._entries.length === 0) {
      return nothing;
    }
    const background = mobile.background ?? this._config?.background;
    return html`
      <nav
        class="dashboard-sidebar-bar"
        data-labels=${mobile.labels ?? 'never'}
        style=${background ? `background:${background}` : ''}
        aria-label="Dashboard bar"
      >
        <div class="dashboard-sidebar-bar-slots">
          ${this._entries.map((entry, i) => this._renderSlot(entry, i))}
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
