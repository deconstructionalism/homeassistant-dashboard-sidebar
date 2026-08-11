# Dashboard Sidebar

[![CI](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/deconstructionalism/homeassistant-dashboard-sidebar?sort=semver)](https://github.com/deconstructionalism/homeassistant-dashboard-sidebar/releases)
[![HACS: Dashboard](https://img.shields.io/badge/HACS-Dashboard-41BDF5.svg)](https://hacs.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A collapsible dashboard sidebar card for Home Assistant Lovelace: navigation,
clock, and custom content in a side rail that collapses to an icon strip. It is
edited in place through a four-tab visual editor (Settings, Header, Body,
Footer), and everything it produces is plain YAML under a `dashboard_sidebar` key.

📖 **[Documentation](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/)**: configuration reference, the visual editor, styling, and actions.

<p>
  <img src="https://raw.githubusercontent.com/deconstructionalism/homeassistant-dashboard-sidebar/main/docs/assets/editor/sidebar-expanded.png" alt="The sidebar expanded, with a title, clock, date, navigation items, a Rooms group, and a footer button row" height="600">
  <img src="https://raw.githubusercontent.com/deconstructionalism/homeassistant-dashboard-sidebar/main/docs/assets/editor/sidebar-collapsed.png" alt="The same sidebar collapsed to a slim icon strip" height="600">
</p>


## Features

- 📐 **Docks where you want it.** Left or right, any width, pushing the view
  over or floating on top of it.
  ([settings](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/configuration/))
- ↔️ **Collapses to an icon strip.** One toggle on the edge, remembered per browser.
  Items keep hover tooltips, categories pop out their children.
- 🧩 **Three regions, plenty to fill them with.** A pinned header, a scrolling body,
  and a pinned footer, holding titles, clocks, dates, dividers, tappable items,
  collapsible categories, markdown, and any Lovelace card.
  ([elements](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/elements/),
  [footer](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/footer/))
- 👆 **Tap, hold, and double tap.** Toggle, more-info, navigate, url, or
  call-service, each gesture with its own target.
  ([actions](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/actions/))
- 📍 **Knows where you are.** Navigation links highlight the page you're on,
  sub-paths included, and follow you as you move.
- 🪄 **Jinja where it counts.** Text, icons, and color fields all template, so a
  lock icon can go red when it's unlocked.
- 🎨 **Wears your theme.** Colors, corners, shadows, and type follow the active
  Home Assistant theme, reading the same variables as HA's own nav sidebar.
- 🖌️ **Styleable down to the pixel.** Per-element colors, any CSS background, and
  [card-mod](https://github.com/thomasloven/lovelace-card-mod) at both the whole
  sidebar and per-element level.
  ([styling](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/styling/))
- 🖱️ **Built by clicking, not typing.** A four-tab editor with a live preview,
  drag-to-reorder, an icon picker, a Test Action button, and a YAML escape hatch
  on every tab and element.
- 🌱 **Starts with something real.** The **+ Sidebar** button seeds a starter built
  from your own views and lights, not an empty box.
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
