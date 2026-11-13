# Footer

The footer is pinned to the bottom of the sidebar and never scrolls. It has
**exactly one** of three modes (a **Button Row**, a **Card**, or a
**Markdown** block) plus an optional top divider bar.

=== "Visual editor"

    Switch modes in the editor's **Footer** tab via the **⋯** menu → **Change to**.
    The **⋯** menu also toggles the top divider and flips this tab between UI and
    YAML editing.

=== "YAML"

    The mode is chosen by which key you set under `footer`: `buttons`, `card`, or
    `markdown`. Set `divider: false` to hide the top divider bar.

## Button Row

A row of icon buttons. When they don't all fit, the overflow collapses into a
vertical **⋯** menu (in both expanded and collapsed views).

=== "Visual editor"

    In the **Footer** tab (Button Row mode), press **+** to add a button. Each
    button takes an **Icon**, an optional **Entity**, a **Title** (tooltip), and
    its own **Tap/Hold/Double Tap** actions. **Icon Color** and **Styles YAML**
    live under **Advanced**. Drag to reorder. To line the row up left, center
    or right, use **Align** under **Footer Settings**.

    ![The Footer tab with a footer button selected, its icon and action fields on the left.](assets/editor/footer-buttons.png)

=== "YAML"

    ```yaml
    footer:
      divider: true          # show the top divider bar; default true
      align: center          # left (default), center, or right
      buttons:
        - icon: mdi:lightbulb
          icon_color: '{{ "#ffb74d" if is_state("light.kitchen","on") else "grey" }}'
          title: Kitchen      # tooltip / accessible label; templatable
          entity: light.kitchen
          tap_action:
            action: toggle
        - icon: mdi:cog
          tap_action:
            action: navigate
            navigation_path: /config/dashboard
    ```

Each button supports the same [actions](actions.md), an `icon_color` template,
and an **Advanced** section (`uix` styles). Collapsed, the whole row becomes a
single **⋯** menu, always centered whatever `align` says.

`align` also lines up the footer strip in the [mobile bar](mobile.md)'s menu.
A mirrored bar follows this footer's `align`; a custom bar has its own footer,
so set `align` on `mobile.footer` instead.

## Card

Any Lovelace card, full width.

=== "Visual editor"

    In the **Footer** tab, use **⋯** → **Change to → Card**, then paste any
    Lovelace card config.

=== "YAML"

    ```yaml
    footer:
      divider: true
      card:
        type: entities
        entities:
          - light.kitchen
    ```

## Markdown

Markdown with Jinja.

=== "Visual editor"

    In the **Footer** tab, use **⋯** → **Change to → Markdown**, then write the
    markdown. A **Text Color** and **Tap/Hold/Double Tap** actions are available so
    the footer can act as a link or toggle.

=== "YAML"

    ```yaml
    footer:
      divider: false
      markdown: '**{{ states("sensor.power") }} W** right now'
      markdown_color: var(--secondary-text-color)
      # tap_action / hold_action / double_tap_action also supported
    ```

The markdown footer can carry [tap/hold/double-tap actions](actions.md), so it
can act as a link or toggle.

## Styling the footer

The footer row takes the same styling hooks as every element, in any mode:
`uix` (or `card_mod`), plus `class` and `id`. Its styles are **scoped to the
footer row**, so a bare `.dashboard-sidebar-footer` selector only touches the
footer. See [Styling](styling.md#uix-and-card-mod).

=== "Visual editor"

    In the **Footer** tab, open **Footer Settings** and write your styles in
    **Styles YAML**. The footer's targetable classes are listed under it.

=== "YAML"

    ```yaml
    footer:
      align: right
      class: my-footer
      uix:
        style: |
          .dashboard-sidebar-footer {
            border-top: 2px solid var(--primary-color);
          }
      buttons:
        - icon: mdi:cog
          tap_action: { action: navigate, navigation_path: /config/dashboard }
    ```

The same footer's styles apply to the footer strip in a mirrored
[mobile bar](mobile.md)'s menu, which carries the class
`.dashboard-sidebar-bar-sheet-footer` instead.
