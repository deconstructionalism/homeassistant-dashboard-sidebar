# Styling

## Themes

The sidebar follows the active Home Assistant theme without any configuration.
Its text, icons, and selected state read the same variables themes already use
for Home Assistant's own navigation sidebar, so a theme that styles that rail
styles this one to match. The panel itself takes the **card** background
instead: themes often paint the nav rail the same color as the page behind it,
which would leave the sidebar with no visible edge against your dashboard.

| What | Theme variable | Falls back to |
| --- | --- | --- |
| Panel and popover background | `card-background-color` | `primary-background-color` |
| Text | `sidebar-text-color` | `primary-text-color` |
| Icons | `sidebar-icon-color` | `paper-item-icon-color`, then `primary-text-color` |
| Active (current page) item | `sidebar-selected-icon-color` / `sidebar-selected-text-color` | `primary-color` |
| Dividers, hover | `divider-color` | a translucent grey |
| Corner radius | `ha-card-border-radius` | the built-in 10-12px |
| Borders | `ha-card-border-width` / `ha-card-border-color` | 1px of `divider-color` |
| Shadows | `ha-card-box-shadow` | the built-in shadows |
| Type | `ha-font-size-*`, `ha-font-weight-*`, `ha-font-family-body` | the built-in rem sizes |

Each falls back to the general card and text tokens, so a theme that defines
none of the sidebar-specific ones still renders correctly. To paint the panel
with the nav rail's color after all, set
`--dashboard-sidebar-background: var(--sidebar-background-color)` in the sidebar's styles (`uix:`).
A theme that flattens
its cards (`ha-card-box-shadow: none`) flattens the sidebar's popovers too; they
keep a border so they still read as a separate surface.

### Theme variables

Every color, radius, and shadow resolves through a `--dashboard-sidebar-*` variable. Set one
from [UIX or card-mod](#uix-and-card-mod) (or from a theme) and every element that uses it
changes at once, without hunting for selectors:

| Variable | Applies to |
| --- | --- |
| `--dashboard-sidebar-background` | the sidebar panel |
| `--dashboard-sidebar-surface-background` | popovers, tooltips, the collapse toggle |
| `--dashboard-sidebar-text-color` / `--dashboard-sidebar-icon-color` | label text / icons |
| `--dashboard-sidebar-accent-color` / `--dashboard-sidebar-accent-text-color` | the active item's tint and text |
| `--dashboard-sidebar-on-accent-color` | text on a filled active icon |
| `--dashboard-sidebar-divider-color` / `--dashboard-sidebar-hover-background` | dividers and guide lines / row hover |
| `--dashboard-sidebar-item-radius` / `--dashboard-sidebar-radius` / `--dashboard-sidebar-tooltip-radius` | rows and buttons / popovers / tooltips |
| `--dashboard-sidebar-border` | the popover border |
| `--dashboard-sidebar-popover-shadow` / `--dashboard-sidebar-tooltip-shadow` / `--dashboard-sidebar-toggle-shadow` | those elements' elevation |
| `--dashboard-sidebar-overlay-shadow` | the sidebar's own edge in [overlay](configuration.md#push-or-overlay) mode |

```yaml
dashboard_sidebar:
  uix:
    style: |
      :host {
        --dashboard-sidebar-accent-color: #ff9800;
        --dashboard-sidebar-item-radius: 0px;
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

## UIX and card-mod

For full CSS control, Dashboard Sidebar hands your styles to a styling
engine. It supports two, in this order:

1. **[UIX](https://github.com/Lint-Free-Technology/uix)** (recommended). The
   successor to card-mod, from card-mod's own maintainer. This project supports
   UIX first.
2. **[card-mod](https://github.com/thomasloven/lovelace-card-mod)**. Still
   supported as a fallback when UIX is not installed. card-mod support **will
   be deprecated** in a future release, so new setups should use UIX.

Install either one through HACS. When both are installed, UIX does the
styling. If you are moving from card-mod to UIX, UIX's own migration steps say
to uninstall card-mod; the sidebar keeps working through that switch.

### `uix:` or `card_mod:`

Write styles under the **`uix:`** key. The older **`card_mod:`** key still
works everywhere `uix:` does, so existing configs keep their styling unchanged.

- Either engine renders either key: a `card_mod:` config is styled by UIX when
  UIX is installed, and a `uix:` config is styled by card-mod when only
  card-mod is installed.
- If an element has both keys, **`uix:` wins** and `card_mod:` is ignored, the
  same rule UIX applies to cards.
- The visual editor always saves under `uix:`. Editing a style that is still
  under `card_mod:` moves it to `uix:` when you save; styles you don't touch
  stay where they are.

Styles are available at four levels, all edited in a **Styles YAML** field:

- **Whole sidebar**: Settings → Advanced. Styles the sidebar's shadow root;
  target the `dashboard-sidebar-*` classes below.
- **Per element**: each element's Advanced section. **Automatically scoped** to
  that one element, so a bare selector like `.dashboard-sidebar-item-label` only
  affects the element you are editing, not every element in the sidebar.
- **Footer**: Footer → Footer Settings (`footer.uix`). Scoped to the footer row;
  see [Footer](footer.md#styling-the-footer).
- **Mobile bar**: Mobile Bar → Advanced (`mobile.uix`). A mirrored bar with no
  styles of its own uses the whole-sidebar styles.

=== "Visual editor"

    Open the element (or **Settings** for the whole sidebar), expand
    **Advanced → Styles YAML**, and write your styles. The field says whether
    UIX or card-mod is styling them (and, for card-mod, how to switch to UIX),
    and the targetable classes are listed right under it.

=== "YAML"

    ```yaml
    dashboard_sidebar:
      uix:
        style: |
          .dashboard-sidebar-item-label { font-weight: 600; }
          :host { border-right: 2px solid var(--primary-color); }
    ```

If neither UIX nor card-mod is installed, the Styles fields are hidden and
replaced with a prompt to install UIX.

Styles that load late are fine: UIX and card-mod are frontend modules that
can finish loading after the sidebar has drawn, and the sidebar applies its
styles as soon as one of them is ready.

## CSS class

Give an element a `class` as a stable hook to target it from the sidebar-level
styles. This is a **YAML-only** field (the visual editor styles elements
through per-element Styles instead):

```yaml
body:
  - type: item
    title: Home
    class: nav-home
    tap_action: { action: navigate, navigation_path: /lovelace/home }
uix:
  style: |
    .nav-home { text-transform: uppercase; }
```

## Targetable classes

Every rendered element carries a stable class, listed in the editor under each
Styles field. Common ones:

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
