# Contributing

Thanks for helping out. This is a Lovelace **dashboard resource** (a JS module),
not a Python integration. User-facing docs live at
<https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/>; this file is for
working on the code.

## Setup

```bash
npm install
npm run check        # the full gate: lint + format + drift checks + unit tests + build
```

`npm run check` is exactly what CI runs. Get it green before opening a PR.

### Everyday scripts

| Script | What |
| --- | --- |
| `npm run build` / `npm run watch` | bundle to `dist/dashboard-sidebar-card.js` (watch adds sourcemaps) |
| `npm run lint` / `npm run lint:fix` | ESLint (TS) + Stylelint (CSS-in-JS) |
| `npm run format` / `npm run format:fix` | Prettier |
| `npm run test:unit` | vitest, Node — pure logic |
| `npm run test:browser` | web-test-runner, real Chromium — rendering |
| `npm run schema:gen` / `npm run docs:config` | regenerate the generated files (see below) |
| `npm run docs:shots` | regenerate the editor screenshots for the docs |
| `npm run bench` | time how fast visibility follows each kind of change (see `bench/README.md`) |
| `npm run ha:conditions [tag]` | fetch Home Assistant's condition code for the parity tests (see Tests) |
| `mkdocs serve` | preview the docs site (needs `pip install mkdocs-material`) |

### Tooling

| Concern | Tool |
| --- | --- |
| Language | TypeScript (Lit 3, decorators) |
| Bundler | Rollup (terser-minified ES module) |
| TS/JS lint | ESLint flat config + typescript-eslint + lit/wc |
| CSS-in-JS lint | Stylelint via `postcss-lit` (lints `css` blocks) |
| Formatting | Prettier |

`npm run lint:css` runs Stylelint against the `.ts` sources; `postcss-lit`
extracts the CSS inside Lit `` css`…` `` and `` html`<style>…` `` template
literals so the styles are linted like real CSS.

### Local testing in Home Assistant

1. `npm run build`
2. Copy `dist/dashboard-sidebar-card.js` to `/config/www/`
3. Add a dashboard resource pointing at `/local/dashboard-sidebar-card.js`
   (type: JavaScript Module)
4. Add a sidebar to a dashboard (see the
   [docs](https://deconstructionalism.github.io/homeassistant-dashboard-sidebar/install/))

## Regenerate, don't hand-edit

`src/lib/types.ts` is the **single source of truth** for the config schema. Two
generated artifacts derive from it, and CI fails if either drifts:

- `src/lib/schema.generated.ts` — field sets and enum values, consumed at runtime
  by `validate.ts` and the editor. Regenerate with `npm run schema:gen`.
- `docs/reference.md` — the config reference. Regenerate with `npm run docs:config`.

So when you add or rename a config field: edit `types.ts` (with JSDoc), run
`npm run schema:gen && npm run docs:config`, and commit the results. **Do not**
hand-edit the generated files or the allowed-key lists in `validate.ts` (its only
deliberate exception is `LEGACY_CLOCK_KEYS`). `npm run check` runs both drift
checks. Editor screenshots are committed by a human after eyeballing them
(`npm run docs:shots`); CI only smoke-tests that the harness still runs.

## Architecture

- **`src/dashboard-sidebar-card.ts`** — entry; registers the custom elements.
- **`src/lib/bootstrap.ts`** — injects the sidebar into the Lovelace view, adds
  the floating **+ Sidebar** button, and reads the `dashboard_sidebar` config key.
- **`src/dashboard-sidebar.ts`** — the `<dashboard-sidebar>` card: renders the
  header/body/footer regions, collapse behavior, and live templating.
- **`src/editor/`** — the `<dashboard-sidebar-editor>` modal. `sidebar-editor.ts`
  is the component; `block-form.ts` builds the per-element fields; `arrange.ts` is
  drag-reorder; `editor-dialogs.ts` / `editor-menus.ts` / `editor-preview.ts` are
  extracted render helpers (`editor-menus.ts` also holds the `MenusController`);
  `editor-styles.ts` is the CSS.
- **`src/lib/`** — `types.ts` (schema source), `validate.ts`, `templates.ts`
  (`TemplateManager`), `styling.ts` (UIX first, card-mod fallback), `format.ts`, `action.ts`, `const.ts`, and
  the generated `schema.generated.ts`.
- **`src/styles/`** — the card's CSS-in-JS modules.
- **`scripts/`** — `gen-schema.js`, `gen-config-docs.js`, and
  `screenshots/shoot.mjs` (the Playwright docs-screenshot harness).

## Tests

- `*.test.ts` runs under **vitest** (Node); `*.browser.test.ts` runs under
  **web-test-runner** (Chromium). Anything touching the DOM, `customElements`, or
  `CSSStyleSheet` must be a `.browser.test.ts`.
- Group a module's tests in the file named after that module (e.g. every
  `validateConfig` suite lives in `lib/validate.test.ts`).

### Visibility: snapshots and parity with Home Assistant

Visibility has to behave exactly like a card's Visibility tab, so it is tested
three ways, all from one table of cases (`src/lib/visibility.cases.ts`: a fixed
house, a fixed moment, every permutation of each condition's fields, and
and / or / not combinations):

- **Linting snapshots** (`lib/visibility.lint.test.ts`, vitest): what the
  validator says about each case, the browser's result, what is sent to Home
  Assistant, and the outcome once it answers. Stored in
  `lib/__snapshots__/`. After a deliberate change, review the diff and update
  with `npx vitest run -u src/lib/visibility.lint.test.ts`.
- **UI snapshots** (`editor/visibility-tab.snapshot.browser.test.ts`): the
  Visibility tab for each case, as text: every row (type, summary, live
  status) and every row's form (values, states, errors, hints, buttons). Stored
  in `editor/__snapshots__/`; Chromium and WebKit must both match. Update with
  `npx web-test-runner src/editor/visibility-tab.snapshot.browser.test.ts --update-snapshots`.
- **Parity** (`lib/visibility.parity.test.ts`, vitest): runs every case
  through our engine and through Home Assistant's own frontend code, and fails
  on any difference: each browser check, the first guess before the server
  answers, the `subscribe_condition` payloads, and the combined result.

  Home Assistant's code (Apache-2.0) is not committed. The test fetches it on
  demand into `test/ha-frontend/` (git-ignored), pinned by
  `test/ha-frontend.lock.json` to an exact commit with a SHA-256 hash for
  every file. A file that doesn't match its hash is refused and the test
  fails; a bad cached copy is replaced by a verified one. Offline with no
  cached copy, the parity tests are skipped with a warning (the snapshot
  suites still run). `npm run ha:conditions` fetches and checks the pinned
  files by hand.

  To move to a new Home Assistant release:
  `npm run ha:conditions -- --update <tag>` resolves the tag to its commit
  and pins the new hashes; commit the lock file change, run the tests, port
  any differences into `lib/visibility.ts`, and update the release named in
  its header.

## Conventions

- Keep comments about *why*, not a restatement of the code.

## Releasing

Publishing a GitHub **Release** (which creates the `vX.Y.Z` tag) triggers
`release.yml`, which builds the card and attaches `dashboard-sidebar-card.js` to
the release — that asset is what HACS downloads. Bump `version` in `package.json`
to match the tag.
