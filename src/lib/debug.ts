/**
 * Temporary runaway-loop watchdog for the editor's mobile preview. Counts
 * hot-path invocations per rolling second and logs one breakdown when any
 * counter blows past its threshold, so a crash-in-progress leaves evidence
 * in the console. Remove once the resize crash is understood.
 */

/** Rolling per-second counters by label. */
const counts = new Map<string, number>();

/** The rolling window's start timestamp. */
let windowStart = 0;

/** Whether this window already logged (one report per window). */
let reported = false;

/** Counts one hit and reports when the window runs hot. */
export const tick = (label: string): void => {
  const now = performance.now();
  if (now - windowStart > 1000) {
    windowStart = now;
    counts.clear();
    reported = false;
  }
  const n = (counts.get(label) ?? 0) + 1;
  counts.set(label, n);
  if (!reported && n > 240) {
    reported = true;
    // eslint-disable-next-line no-console
    console.error(
      '[dashboard-sidebar] runaway loop suspected:',
      JSON.stringify([...counts.entries()]),
    );
  }
};
