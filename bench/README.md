# Visibility latency benchmark

How quickly the sidebar follows a change that affects its `visibility`, and
how much work it does in between, comparing the old approach (checking once a
second) with the current one (reacting to events). Part of #4.

Run it with `npm run bench` (Chromium, about 4 minutes). It prints one
`BENCH {...}` line of JSON.

## Method

`latency.bench.ts` mounts the real sidebar code (`startSidebar`) in a test
browser, against a stand-in for Home Assistant's frontend that behaves like
the real one where it matters:

- `<home-assistant>` hands every new hass object to registered providers
  (`provideHass`), and the panel passes it down to `hui-root`.
- `hui-root` is a Lit element that re-renders when hass or the dashboard
  config (`lovelace`) change, with the view inside its shadow root.
- A `subscribe_condition` stand-in lets the test push server results.

Each trial makes one change and times it with `performance.now()` until the
sidebar is mounted or removed (checked every 2ms, so results carry up to 2ms
of measuring noise). Before each change it waits a random 0 to 1s, so changes
land at random points of any poll. The bench uses only `startSidebar` and
`ensureSidebar`, which both versions export, so the same file measures either.
"Before" is commit 391d86a, run from a git worktree; "after" is b049a34. They ran back to back on the same machine (macOS,
Chromium headless).

| Trial | The change |
| --- | --- |
| Entity state | `input_boolean.kiosk` flips; a `state` condition hides or shows on it |
| User switch | the hass user changes; a `user` condition |
| Screen, no resize | dark mode toggles (`emulateMedia`); a `(prefers-color-scheme: dark)` screen condition. Includes the test runner's round trip to the browser |
| Time boundary | a `time` condition with `after` 1.2 to 2.2s ahead; timed from the boundary |
| Server push | a `template` condition; the stand-in pushes false, then true |
| Edit mode | a sidebar hidden from you; edit mode toggles on (it must show) and off. Includes building the sidebar |
| Idle | one minute with no changes: how many mount checks run |
| Busy | an unrelated entity changes every 200ms for a minute: how many checks run |

Checks are counted by wrapping `ShadowRoot.prototype.getElementById` for the
sidebar wrapper's id, which every check looks up once. The cost of one check
is timed by calling `ensureSidebar()` 2000 times in a steady state.

## Findings

Latency in ms, median / p95 (15 to 30 trials each, 6 for time):

| Change | Before (1s poll) | After (events) |
| --- | --- | --- |
| Entity state, hide | 457 / 807 | 0.4 / 1.5 |
| Entity state, show | 646 / 945 | 0.6 / 2.9 |
| User switch | 610 / 922 | 0.4 / 1.3 |
| Screen query flips without a resize | 533 / 958 | 14.6 / 22.1 |
| Edit mode toggle | 582 / 985 | 4.9 / 5.5 |
| Time boundary | never (not supported) | 57 / 67 |
| Server push (template) | never (not supported) | 0.5 / 1.2 |

Work between changes:

| | Before | After |
| --- | --- | --- |
| Idle, checks per minute | 60 | 0 |
| Busy (300 updates a minute), checks per minute | 60 | 300 |
| Cost of one check | 0.005 ms | 0.004 ms |

- Before, a change waited for the next poll: half a second on average, up to
  a full second.
- After, a change shows up as soon as Home Assistant reports it. A quiet
  house costs nothing.
- The screen trial is mostly the test runner's own round trip; the sidebar
  reacts as the browser fires the media query's change event.
- The time trial is deliberately 50ms past the boundary, so the clock has
  safely rolled over.
- In a busy house the sidebar checks once per hass update instead of once a
  second, like any card. A check that reads nothing that changed returns
  early: 300 a minute is about 1ms of work.
- A first after-run found two checks per hass update (one from
  `provideHass`, one from `hui-root` re-rendering). The `hui-root` hook now
  reacts only to a new `lovelace` object (a config save or edit-mode toggle),
  which brought it to one.

These numbers come from the stand-in, not a live Home Assistant. They show
the difference between the approaches; a real instance adds its own
websocket and rendering time to both.
