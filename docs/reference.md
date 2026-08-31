<!-- Auto-generated from src/lib/types.ts by scripts/gen-config-docs.js.
     Do not edit by hand: run `npm run docs:config` to regenerate. -->

# Configuration reference

Every option the card accepts, generated straight from the source. Each block in `header` or `body` is one of the block types below, chosen by its `type` field. A field with **yes** in the Required column must be present; everything else is optional.

## Top-level configuration

The full configuration read from the Lovelace `dashboard_sidebar` key.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `position` | `SidebarPosition` | no | Edge the sidebar docks to. Default left. |
| `width` | `number` | no | Expanded width in pixels. Default 240. |
| `start_collapsed` | `boolean` | no | Whether the sidebar starts collapsed, before any stored preference. |
| `overlay` | `boolean` | no | Whether the sidebar floats over the dashboard content instead of pushing it aside. Default false (push): the view narrows by the sidebar's width. |
| `hide_on_mobile` | `boolean` | no | Hide the sidebar on narrow (mobile) viewports. |
| `hide_on_desktop` | `boolean` | no | Mobile-only mode: the desktop sidebar never renders; only the mobile bar shows, at and below the breakpoint. Requires a `mobile` config, which can still reference desktop-defined elements even though they stay hidden on desktop. |
| `background` | `string` | no | Sidebar background: any CSS `background` value (color, gradient, image, …), applied as the `background` shorthand. Defaults to the theme card background. |
| `header` | `SidebarBlock[]` | no | Blocks pinned to the top, above the scrolling body. |
| `body` | `SidebarBlock[]` | no | Blocks in the scrolling region below the header. |
| `footer` | `FooterConfig` | no | The bottom bar configuration. |
| `mobile` | `MobileConfig` | no | The mobile bar configuration. |
| `card_mod` | `Record<string, unknown>` | no | Passed to the card-mod integration (when installed) to style the sidebar. Target the dashboard-sidebar-* classes on the rendered elements. |

## Common fields (every block and footer button)

CSS targeting hooks shared by every block and footer button.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `class` | `string` | no | Extra CSS class(es) added to the rendered root, alongside the built-in dashboard-sidebar-* classes, so card-mod can target this one element. |
| `id` | `string` | no | CSS id set on the rendered root, so card-mod can target this one element. |
| `card_mod` | `Record<string, unknown>` | no | Per-element card-mod config (a `{ style, class, ... }` object), applied to this element's rendered root via the card-mod integration when installed. |

## Title block

Set `type: title` to use this block.

A heading block showing templatable text. Hidden while collapsed.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'title'` | yes | Block discriminator. |
| `text` | `MaybeTemplate` | yes | The heading text. Templatable. |
| `align` | `Align` | no | Horizontal alignment. Default center. |
| `text_color` | `MaybeTemplate` | no | Optional text color, any CSS color. Templatable. |
| `tap_action` | `ActionConfig` | no | Optional action performed when tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Optional action performed when held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Optional action performed when double-tapped. Not templatable. |
| `active_highlight` | `boolean` | no | Whether to highlight this element while its navigate tap action targets the current page. Default true; set false to disable the active highlight. |

## Clock block

Set `type: clock` to use this block.

A digital clock block.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'clock'` | yes | Block discriminator. |
| `format` | `TimeFormat` | no | An strftime pattern for the time. One of the presets (`%-I:%M %p`, `%H:%M`, `%-I:%M:%S %p`, `%H:%M:%S`) or any custom pattern. Empty defaults to `%H:%M`. |
| `timezone` | `string` | no | IANA time zone to render in; empty uses the system zone. |
| `align` | `Align` | no | Horizontal alignment. Default center. |
| `text_color` | `MaybeTemplate` | no | Optional text color, any CSS color. Templatable. |
| `tap_action` | `ActionConfig` | no | Optional action performed when tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Optional action performed when held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Optional action performed when double-tapped. Not templatable. |
| `active_highlight` | `boolean` | no | Whether to highlight this element while its navigate tap action targets the current page. Default true; set false to disable the active highlight. |

## Date block

Set `type: date` to use this block.

A date block.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'date'` | yes | Block discriminator. |
| `format` | `DateFormat` | no | An strftime pattern (a preset or a custom one); empty uses the locale date. |
| `timezone` | `string` | no | IANA time zone to render in; empty uses the system zone. |
| `align` | `Align` | no | Horizontal alignment. Default center. |
| `text_color` | `MaybeTemplate` | no | Optional text color, any CSS color. Templatable. |
| `tap_action` | `ActionConfig` | no | Optional action performed when tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Optional action performed when held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Optional action performed when double-tapped. Not templatable. |
| `active_highlight` | `boolean` | no | Whether to highlight this element while its navigate tap action targets the current page. Default true; set false to disable the active highlight. |

## Divider block

Set `type: divider` to use this block.

A horizontal rule block.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'divider'` | yes | Block discriminator. |
| `color` | `MaybeTemplate` | no | Optional line color, any CSS color. Templatable. |

## Item block

Set `type: item` to use this block.

A single tappable row. Standalone in a region, or nested in a category.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'item'` | no | Block discriminator. Optional inside a category's item list. |
| `title` | `MaybeTemplate` | yes | Row label. Templatable. |
| `icon` | `MaybeTemplate` | no | Optional mdi icon shown before the label. Templatable. |
| `abbr` | `string` | no | Collapsed glyph override, used only when no icon is set. Defaults to the initials of the title; set it to disambiguate colliding initials. |
| `text_color` | `MaybeTemplate` | no | Optional label color, any CSS color. Templatable. |
| `icon_color` | `MaybeTemplate` | no | Optional icon color, any CSS color. Templatable. |
| `entity` | `string` | no | Target entity for toggle / more-info actions. Not templatable. |
| `tap_action` | `ActionConfig` | yes | Action performed when the row is tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Optional action performed when held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Optional action performed when double-tapped. Not templatable. |
| `active_highlight` | `boolean` | no | Whether to highlight this element while its navigate tap action targets the current page. Default true; set false to disable the active highlight. |

## Category block

Set `type: category` to use this block.

A collapsible group of items, nested one level deep.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'category'` | yes | Block discriminator. |
| `title` | `MaybeTemplate` | yes | Group heading text. Templatable. |
| `icon` | `MaybeTemplate` | no | Optional mdi icon shown before the heading. Templatable. |
| `abbr` | `string` | no | Collapsed glyph override, used only when no icon is set. Defaults to the initials of the title; set it to disambiguate colliding initials. |
| `text_color` | `MaybeTemplate` | no | Optional heading text color, any CSS color. Templatable. |
| `icon_color` | `MaybeTemplate` | no | Optional heading icon color, any CSS color. Templatable. |
| `start_collapsed` | `boolean` | no | Whether the group starts collapsed when the sidebar is expanded. |
| `guide_line` | `boolean` | no | Whether to draw the vertical guide line beside the items. Default true. |
| `items` | `ItemBlock[]` | yes | The rows in this group. Categories cannot nest further. |

## Markdown block

Set `type: markdown` to use this block.

A markdown block: Home Assistant markdown with Jinja templating.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'markdown'` | yes | Block discriminator. |
| `content` | `MaybeTemplate` | yes | Markdown content; Jinja templates resolve at runtime. Templatable. |
| `align` | `Align` | no | Horizontal alignment. Default left. |
| `text_color` | `MaybeTemplate` | no | Optional text color, any CSS color. Templatable. |

## Card block

Set `type: card` to use this block.

A manual card block: any Lovelace card, authored as YAML.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `'card'` | yes | Block discriminator. |
| `card` | `LovelaceCardConfig` | yes | Any Lovelace card config. |
| `align` | `Align` | no | Horizontal alignment of the card. Default left. |
| `background` | `string` | no | Card background, any CSS `background` value. |

## Footer

The bottom bar. Exactly one of `buttons`, `card`, or `markdown`: an ordered set of icon buttons (with overflow into a dots menu), a single manual card, or a markdown block. A card or markdown footer shows no dots menu and is hidden while collapsed.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `divider` | `boolean` | no | Whether the footer shows its top divider bar. Default true. |
| `buttons` | `FooterButtonConfig[]` | no | Ordered icon buttons. Mutually exclusive with `card`/`markdown`. |
| `card` | `LovelaceCardConfig` | no | A manual Lovelace card, replacing the buttons. |
| `markdown` | `MaybeTemplate` | no | Markdown content with Jinja templating, replacing the buttons. Templatable. |
| `markdown_color` | `MaybeTemplate` | no | Optional text color for the markdown footer, any CSS color. Templatable. |
| `tap_action` | `ActionConfig` | no | Action fired when the markdown footer is tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Action fired when the markdown footer is held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Action fired when the markdown footer is double-tapped. Not templatable. |

## Footer button

An icon button in the footer's button bar.

Also accepts the [Common fields (every block and footer button)](#common-fields-every-block-and-footer-button) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `icon` | `MaybeTemplate` | yes | mdi icon shown in the button. Templatable. |
| `icon_color` | `MaybeTemplate` | no | Optional icon color, any CSS color. Templatable. |
| `title` | `MaybeTemplate` | no | Optional tooltip / accessible label. Templatable. |
| `entity` | `string` | no | Target entity for toggle / more-info actions. Not templatable. |
| `tap_action` | `ActionConfig` | yes | Action performed when the button is tapped. Not templatable. |
| `hold_action` | `ActionConfig` | no | Optional action performed when held. Not templatable. |
| `double_tap_action` | `ActionConfig` | no | Optional action performed when double-tapped. Not templatable. |
| `active_highlight` | `boolean` | no | Whether to highlight this element while its navigate tap action targets the current page. Default true; set false to disable the active highlight. |

## MobileOverride

The properties of a reused element that mobile may replace. A patch never carries `id` (the reference itself) or `type` (identity is not patchable).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | `MaybeTemplate` | no | Replacement label. Templatable. |
| `icon` | `MaybeTemplate` | no | Replacement mdi icon. Templatable. |
| `abbr` | `string` | no | Replacement collapsed glyph for an icon-less element. |
| `text_color` | `MaybeTemplate` | no | Replacement label color, any CSS color. Templatable. |
| `icon_color` | `MaybeTemplate` | no | Replacement icon color, any CSS color. Templatable. |
| `entity` | `string` | no | Replacement target entity for toggle / more-info actions. |
| `tap_action` | `ActionConfig` | no | Replacement tap action. |
| `hold_action` | `ActionConfig` | no | Replacement hold action. |
| `double_tap_action` | `ActionConfig` | no | Replacement double-tap action. |
| `active_highlight` | `boolean` | no | Replacement active-highlight flag. |
| `class` | `string` | no | Extra CSS class(es) on the bar rendering of this element. |
| `card_mod` | `Record<string, unknown>` | no | Per-element card-mod config for the bar rendering of this element. |

## MobileUseEntry

One entry of an explicit mobile bar: a desktop element reused by id, with any of the override properties applied inline.

Also accepts the [MobileOverride](#mobileoverride) below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `use` | `string` | yes | The id of the desktop item, category, or footer button to reuse. |

## MobileConfig

The mobile bar. Its presence hides the sidebar on narrow viewports and renders a bottom bar instead. Without `items` the bar derives from the desktop nav (items and categories in document order) amended by `hide` and `override`; with `items` the list is the whole bar and `hide`/`override` are rejected.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `hide` | `string[]` | no | Ids of derived elements to leave off the bar. Derive mode only. |
| `override` | `Record<string, MobileOverride>` | no | Per-id property patches applied to derived elements. Derive mode only. |
| `items` | `MobileBarEntry[]` | no | The explicit bar: `use:` references and inline items. |
| `menu` | `MobileMenuEntry[]` | no | Curated entries of the dots-menu sheet, shown between any overflowed slots and the footer. `use:` may reference any element, including titles, markdown, and cards. Applies in both derive and explicit mode. |
| `footer` | `MobileBarEntry[]` | no | The sheet's pinned footer strip: `use:` references to footer buttons or items, and inline items, rendered as icon buttons. When set it replaces the strip derived from the desktop footer (and a card/markdown footer). |
| `breakpoint` | `number` | no | Viewport width in pixels at and below which the bar shows. Default 768. |
| `position` | `'top' \| 'bottom'` | no | Screen edge the bar docks to. Default bottom. |
| `labels` | `MobileLabels` | no | Label rendering on the bar. Default never. |
| `background` | `string` | no | Bar background: any CSS `background` value. Defaults to the sidebar's `background`, and through it to the theme card background. |
| `card_mod` | `Record<string, unknown>` | no | Passed to the card-mod integration to style the bar. |

## Field types

The types used in the tables above.

### `MaybeTemplate`

`string`

A string that may contain a Jinja template. When it does it is resolved at runtime against Home Assistant; otherwise the literal string is used.

### `SidebarPosition`

`'left' | 'right'`

Which edge of the dashboard view the sidebar docks to.

### `Align`

`'left' | 'center' | 'right'`

Horizontal alignment applied to a text or card block.

### `TimeFormat`

`string`

Clock format: an alias (`iso` = %H:%M:%S, `24h` = %H:%M, `12h` = %-I:%M %p, `locale`) or a strftime pattern using only time tokens, e.g. `%-I:%M:%S %p`.

### `DateFormat`

`string`

Date format: an alias (`iso` = %Y-%m-%d, `locale`) or a strftime pattern using only date tokens, e.g. `%A, %B %-d` (names localize).

### `SidebarBlock`

`TitleBlock | ClockBlock | DateBlock | DividerBlock | ItemBlock | CategoryBlock | MarkdownBlock | CardBlock`

Any block that can appear in the header or body region.

### `MobileLabels`

`'always' | 'never' | 'active'`

How bar elements label themselves: always, never, or only when active.

### `MobileBarEntry`

`MobileUseEntry | ItemBlock`

An explicit bar entry: a reuse of a desktop element, or an inline item.

### `MobileMenuEntry`

`MobileUseEntry | SidebarBlock`

One curated sheet-menu entry: a reuse of any desktop element by id (no bar-eligibility limit), or an inline block of any kind.

### `ActionConfig`

`action config`

A Home Assistant action (the `tap_action` / `hold_action` / `double_tap_action` value). See [Actions](actions.md) for the shape and every action type.

### `LovelaceCardConfig`

`card config`

Any Home Assistant Lovelace card configuration, exactly as you would write it on a dashboard.
