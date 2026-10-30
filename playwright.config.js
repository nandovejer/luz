import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Every page of the site boots in Auto, from the local hour (catalog's theme-time-boot.js: dusk, night and dawn are
// dark), so a run at 23:00 would not be a run at 14:00. Every context starts with the hour pinned at 14:00 (840
// minutes under "luz-light", the afternoon: light, Vejer), whatever the clock of the machine or of CI (UTC). A spec
// that tests Auto, the moments or the clock itself starts from nothing instead: `test.use({ storageState: NO_CHOICE })`
// (tests/helpers/site-lights.js). The origin is the base URL's, which is where the page's localStorage is.
const PINNED_HOUR = { cookies: [], origins: [{ origin: new URL(BASE_URL).origin, localStorage: [{ name: 'luz-light', value: '840' }] }] };

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry: a test that passes on it is listed as flaky in the CI summary (scripts/ui-summary.js), to be fixed
  retries: process.env.CI ? 1 : 0,
  // The hosted runner has 4 cores: three workers leave one for the dev server (one worker took 2 h 20 min)
  // Locally: four, not half the cores (six on 12), each with its own Chromium; six ran a 14 GB laptop out of memory
  workers: process.env.CI ? 3 : 4,
  // Terminal: one line per test; the HTML report is written but never opened or served.
  // CI: a blob report per shard, merged by the summary job of ui-tests.yml.
  reporter: process.env.CI ? [['github'], ['blob']] : [['line'], ['html', { open: 'never' }]],
  expect: {
    // Visual regression (tests/visual.spec.js). threshold is the per-pixel
    // colour distance (0 to 1; the default 0.2 lets a one-step token change
    // through, 0.1 does not). maxDiffPixelRatio is the share of the image that
    // may differ at all: 0.2 %, which leaves room for anti-aliasing and not
    // for a moved border or a changed fill.
    toHaveScreenshot: { threshold: 0.1, maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: BASE_URL,
    storageState: PINNED_HOUR,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/nojs.spec.js',
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: '**/nojs.spec.js',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: '**/nojs.spec.js',
    },
    // PRINCIPLES.md §3: every page must be usable with JavaScript off
    {
      name: 'chromium-nojs',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: ['**/nojs.spec.js', '**/rtl.spec.js', '**/landing-i18n.spec.js', '**/site-header.spec.js', '**/product-card.spec.js', '**/section-band.spec.js', '**/site-hero.spec.js', '**/table-sort.spec.js', '**/meter.spec.js', '**/avatar.spec.js', '**/cms.spec.js', '**/prose.spec.js', '**/meta.spec.js', '**/site-submenu.spec.js', '**/site-banner.spec.js', '**/css-only-tags.spec.js', '**/site-consent.spec.js', '**/site-mode.spec.js', '**/timeline.spec.js', '**/objects.spec.js', '**/navbar.spec.js', '**/band.spec.js', '**/image.spec.js', '**/skip-link.spec.js', '**/landing-header.spec.js', '**/landing-hero.spec.js', '**/landing-footer.spec.js', '**/landing-section.spec.js', '**/landing-optional-site.spec.js', '**/cms-header.spec.js', '**/cms-page-header.spec.js', '**/cms-optional-site.spec.js', '**/app.spec.js', '**/type-space-scale.spec.js', '**/snippet-picker.spec.js', '**/make-it-yours.spec.js', '**/knobs-reader.spec.js', '**/examples.spec.js', '**/i18n-loader.spec.js', '**/shell-sidebar.spec.js', '**/home-light.spec.js', '**/docs-patterns.spec.js', '**/docs-try-it.spec.js', '**/site-reflow.spec.js', '**/ai-page-reflow.spec.js', '**/docs-nav-html.spec.js', '**/docs-nav-fold.spec.js', '**/tokens-motion-roles.spec.js', '**/prompt-dialog.spec.js', '**/modal.spec.js', '**/docs-catalog-patterns.spec.js', '**/catalog-moved.spec.js', '**/site-faq.spec.js', '**/catalog-names.spec.js', '**/elements-classless.spec.js', '**/conditional-css.spec.js', '**/landing-faq.spec.js', '**/landing-hero-mark.spec.js', '**/landing-hero-buttons.spec.js', '**/landing-native.spec.js', '**/debug-page.spec.js', '**/landing-hero-mark-fallback.spec.js', '**/landing-modes-head.spec.js', '**/theme-time.spec.js', '**/theme-mode-nojs.spec.js', '**/forms-rhythm-luz-controls.spec.js', '**/site-header-repo-icon.spec.js'],
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
