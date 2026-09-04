# Dashboard Sidebar

[![CI](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/deconstructionalism/homeassistant-dashboard-sidebar?sort=semver)](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/releases)
[![HACS: Dashboard](https://img.shields.io/badge/HACS-Dashboard-41BDF5.svg)](https://hacs.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A collapsible dashboard sidebar card for Home Assistant Lovelace: navigation,
clock, and custom content in a side rail that collapses to an icon strip. It is
edited in place through a five-tab visual editor (Settings, Header, Body,
Footer, Mobile Bar), and everything it produces is plain YAML under a
`dashboard_sidebar` key. On narrow screens it can hand off to a mobile bar
docked to the bottom of the display.

📖 **[Documentation](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/)**: configuration reference, the visual editor, styling, and actions.

<p>
  <img src="https://raw.githubusercontent.com/deconstructionalism/homeassistant-dashboard-sidebar/main/docs/assets/editor/sidebar-expanded.png" alt="The sidebar expanded, with a title, clock, date, navigation items, a Rooms group, and a footer button row" height="600">
  <img src="https://raw.githubusercontent.com/deconstructionalism/homeassistant-dashboard-sidebar/main/docs/assets/editor/sidebar-collapsed.png" alt="The same sidebar collapsed to a slim icon strip" height="600">
</p>


## Features

- 📐 **Position and width.** Left or right edge, any width, pushing the view
  aside or floating over it.
  ([settings](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/configuration/))
- ↔️ **Collapsible.** One toggle collapses it to an icon strip, remembered per
  browser. Items keep tooltips, categories pop out their children.
- 🧩 **Header, body, and footer.** Titles, clocks, dates, dividers, tappable
  items, collapsible categories, markdown, and any Lovelace card.
  ([elements](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/elements/),
  [footer](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/footer/))
- 📱 **Mobile bar.** Narrow screens can swap the sidebar for a bar docked bottom
  or top, with the overflow folding into a slide-up sheet. It either mirrors the
  desktop nav or is defined separately.
  ([mobile bar](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/mobile/))
- 👆 **Tap, hold, and double tap.** Toggle, more-info, navigate, url, or
  call-service, each gesture with its own target.
  ([actions](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/actions/))
- 📍 **Active page highlighting.** Navigation items mark the page you are on,
  sub-paths included.
- 🪄 **Jinja templates.** Text, icons, and color fields template against Home
  Assistant state.
- 🎨 **Theme aware.** Colors, corners, shadows, and type follow the active theme,
  reading the same variables as HA's own nav sidebar.
- 🖌️ **card-mod support.** Per-element colors, any CSS background, and
  [card-mod](https://github.com/thomasloven/lovelace-card-mod) at both the
  sidebar and element level.
  ([styling](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/styling/))
- 🖱️ **Visual editor.** Five tabs with a live preview, drag to reorder, an icon
  picker, a Test Action button, and a YAML escape hatch on every tab and element.
- 🌱 **Starter config.** The **+ Sidebar** button seeds one from your own views
  and lights rather than an empty box.
  ([install](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/install/))

## Installation

Install through **[HACS](https://hacs.xyz)**: add this repository as a custom
repository (category **Dashboard**), install it, then open a dashboard in edit
mode and use the **+ Sidebar** button. Full steps, including YAML-mode
dashboards, are in the
**[installation guide](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/install/)**.

Publishing a GitHub release builds the card and attaches
`dashboard-sidebar-card.js`, which is what HACS downloads.

## Contributing

Development setup, the script reference, the architecture map, and the
"regenerate, don't hand-edit" rules for the generated schema and config reference
are all in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## License

MIT
