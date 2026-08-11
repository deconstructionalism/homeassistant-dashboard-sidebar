# Styling

## Themes

The sidebar follows the active Home Assistant theme without any configuration.
Its chrome reads the same variables themes already use for Home Assistant's own
navigation sidebar, so a theme that styles that rail styles this one to match:

| What | Theme variable | Falls back to |
| --- | --- | --- |
| Panel and popover background | `sidebar-background-color` | `card-background-color`, then `primary-background-color` |
| Text | `sidebar-text-color` | `primary-text-color` |
| Icons | `sidebar-icon-color` | `paper-item-icon-color`, then `primary-text-color` |
| Active (current page) item | `sidebar-selected-icon-color` / `sidebar-selected-text-color` | `primary-color` |
| Dividers, hover | `divider-color` | a translucent grey |
| Corner radius | `ha-card-border-radius` | the built-in 10-12px |
| Borders | `ha-card-border-width` / `ha-card-border-color` | 1px of `divider-color` |
| Shadows | `ha-card-box-shadow` | the built-in shadows |
| Type | `ha-font-size-*`, `ha-font-weight-*`, `ha-font-family-body` | the built-in rem sizes |

Each falls back to the general card and text tokens, so a theme that defines
none of the sidebar-specific ones still renders correctly. A theme that flattens
its cards (`ha-card-box-shadow: none`) flattens the sidebar's popovers too; they
keep a border so they still read as a separate surface.

### Theme variables

Every color, radius, and shadow resolves through a `--dsb-*` variable. Set one
from [Card Mod](#card-mod) (or from a theme) and every element that uses it
changes at once, without hunting for selectors:

| Variable | Applies to |
| --- | --- |
| `--dsb-background` | the sidebar panel |
| `--dsb-surface-background` | popovers, tooltips, the collapse toggle |
| `--dsb-text-color` / `--dsb-icon-color` | label text / icons |
| `--dsb-accent-color` / `--dsb-accent-text-color` | the active item's tint and text |
| `--dsb-on-accent-color` | text on a filled active icon |
| `--dsb-divider-color` / `--dsb-hover-background` | dividers and guide lines / row hover |
| `--dsb-item-radius` / `--dsb-radius` / `--dsb-tooltip-radius` | rows and buttons / popovers / tooltips |
| `--dsb-border` | the popover border |
| `--dsb-popover-shadow` / `--dsb-tooltip-shadow` / `--dsb-toggle-shadow` | those elements' elevation |
| `--dsb-overlay-shadow` | the sidebar's own edge in [overlay](configuration.md#push-or-overlay) mode |

```yaml
dashboard_sidebar:
  card_mod:
    style: |
      :host {
        --dsb-accent-color: #ff9800;
        --dsb-item-radius: 0px;
      }
```

## Colors

Most elements accept **text** and **icon** color templates: any CSS color, or a
Jinja template that resolves to one.

=== "Visual editor"

    Set **Text Color** / **Icon Color** on the element (under **Advanced** for the
    text blocks). Any CSS color or a Jinja template that resolves to one works.

=== "YAML"

    ```yaml
    - type: item
      title: Alarm
      icon: mdi:shield
      text_color: '{{ "red" if is_state("alarm_control_panel.home","triggered") else "" }}'
      icon_color: var(--primary-color)
    ```

| Element | Color options |
| --- | --- |
| Title, Clock, Date, Markdown | `text_color` |
| Item, Category | `text_color`, `icon_color` |
| Divider | `color` (the line) |
| Footer button | `icon_color` |
| Markdown footer | `markdown_color` |

## Background

The whole sidebar takes any CSS `background`, including gradients.

=== "Visual editor"

    Set **Background** under **Settings → Advanced**.

=== "YAML"

    ```yaml
    dashboard_sidebar:
      background: linear-gradient(180deg, #1b2735, #090a0f)
    ```

## card-mod

For full CSS control, Dashboard Sidebar integrates with the
[card-mod](https://github.com/thomasloven/lovelace-card-mod) integration (install
it via HACS). Card Mod is available at two levels, both edited under **Advanced →
Card Mod YAML**:

- **Whole sidebar**: Settings → Advanced. Styles the sidebar's shadow root;
  target the `dashboard-sidebar-*` classes below.
- **Per element**: each element's Advanced section. **Automatically scoped** to
  that one element, so a bare selector like `.dashboard-sidebar-item-label` only
  affects the element you are editing, not every element in the sidebar.

=== "Visual editor"

    Open the element (or **Settings** for the whole sidebar), expand
    **Advanced → Card Mod YAML**, and write your styles. The targetable classes
    are listed right under the field.

=== "YAML"

    ```yaml
    dashboard_sidebar:
      card_mod:
        style: |
          .dashboard-sidebar-item-label { font-weight: 600; }
          :host { border-right: 2px solid var(--primary-color); }
    ```

If card-mod is not installed, the Card Mod fields are hidden and replaced with a
prompt to install it.

## CSS class

Give an element a `class` as a stable hook to target it from the sidebar-level
Card Mod. This is a **YAML-only** field (the visual editor styles elements
through per-element Card Mod instead):

```yaml
body:
  - type: item
    title: Home
    class: nav-home
    tap_action: { action: navigate, navigation_path: /lovelace/home }
card_mod:
  style: |
    .nav-home { text-transform: uppercase; }
```

## Targetable classes

Every rendered element carries a stable class, listed in the editor under each
Card Mod field. Common ones:

| Class | Element |
| --- | --- |
| `:host` | the whole sidebar |
| `.dashboard-sidebar-header` / `-body` / `-footer` | the regions |
| `.dashboard-sidebar-title` / `-clock` / `-date` / `-divider` | those elements |
| `.dashboard-sidebar-item` (+ `-item-icon`, `-item-label`, `-initials`) | item rows |
| `.dashboard-sidebar-category` (+ `-category-header`, `-category-items`, `-chevron`) | categories |
| `.dashboard-sidebar-markdown` | Markdown blocks |
| `.dashboard-sidebar-content` | Card wrapper |
| `.dashboard-sidebar-footer-btn` (+ `-footer-icon`, `-footer-more`) | footer buttons |
| `.dashboard-sidebar-popover` / `-tooltip` | collapsed popover / tooltip |
