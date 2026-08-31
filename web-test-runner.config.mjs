import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'src/**/*.browser.test.ts',
  nodeResolve: true,
  concurrency: 1,
  // Compile TypeScript (including the Lit decorators, per tsconfig) on the fly.
  plugins: [esbuildPlugin({ ts: true, target: 'es2021', tsconfig: 'tsconfig.json' })],
  // Chromium covers Android (same engine as Android WebView); WebKit is the
  // iOS Safari / companion-app engine and catches its shadow-DOM quirks.
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
  testFramework: {
    config: { timeout: '10000' },
  },
};
