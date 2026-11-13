import base from '../web-test-runner.config.mjs';

// The latency benchmark: Chromium only, long timeouts, never part of `npm test`.
export default {
  ...base,
  files: 'bench/latency.bench.ts',
  browsers: [base.browsers[0]],
  testFramework: { config: { timeout: '600000' } },
  testsFinishTimeout: 900000,
};
