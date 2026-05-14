# FingerprintJS by BotBlocker

[![Build](https://img.shields.io/badge/build-verified-brightgreen)](.github/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](package.json)
[![Browser Bundle](https://img.shields.io/badge/browser%20bundle-%3C50KB-blue)](scripts/check-size.mjs)
[![Runtime](https://img.shields.io/badge/runtime-no%20production%20deps-success)](package.json)
[![BotBlocker Security](https://img.shields.io/badge/BotBlocker-Security-0f766e)](https://botblocker.top)

FingerprintJS by BotBlocker is a browser fingerprinting and device intelligence SDK for risk, fraud, and bot-defense workflows. It is designed to pair with [BotBlocker Security](https://botblocker.top) while remaining usable as a standalone ESM package or a direct script-tag bundle.

The runtime has no production dependencies, performs no network calls by default, and exposes privacy-aware collector policies, deterministic hashing, bot evidence, private-mode indicators, confidence scoring, storage state, and compact diagnostics.

## Install And Build

```bash
npm ci
npm run verify
```

Generated browser builds:

- `dist/browser/fingerprintjs-botblocker.js`
- `dist/browser/fingerprintjs-botblocker.min.js`

Package entry points:

- `@botblocker/fingerprintjs`
- `@botblocker/fingerprintjs/collectors`
- `@botblocker/fingerprintjs/policy`
- `@botblocker/fingerprintjs/storage`

## ESM Usage

```js
import { hashComponents, loadClient } from '@botblocker/fingerprintjs';

const client = await loadClient({
  namespace: 'my-product',
  profile: 'extended',
  storage: 'local'
});

const result = await client.get({
  consent: { granted: true, purpose: 'fraud-prevention' }
});

const bot = result.components.find((component) => component.id === 'browser.botDetection');
const privacy = result.components.find((component) => component.id === 'browser.privacyMode');
const recalculated = await hashComponents(result.components, { namespace: 'my-product' });

console.log({
  visitorId: result.visitorId,
  bot: bot?.value?.verdict,
  privateMode: privacy?.value?.verdict,
  confidence: result.confidence,
  hashMatches: recalculated.visitorId === result.visitorId
});
```

## Script-Tag Usage

```html
<script src="./dist/browser/fingerprintjs-botblocker.min.js"></script>
<script>
  const client = FingerprintJSBotBlocker.createClient({
    namespace: location.hostname || 'botblocker-demo',
    profile: 'extended',
    storage: 'local'
  });

  client.prepare({ consent: { granted: true } });

  async function identify() {
    const result = await client.get({ consent: { granted: true, purpose: 'security' } });
    console.log(result.visitorId, result.confidence, result.components);
  }
</script>
```

## What The SDK Reports

The SDK returns a deterministic `visitorId`, a full component list, confidence metrics, hash metadata, timing data, storage state, and per-component status/error details.

Core signal groups:

- Runtime: browser runtime, client hints, navigator properties, API feature support, CSS feature support, performance memory diagnostics, Node runtime.
- Risk: bot/automation evidence, browser inconsistency evidence, and private-mode indicators.
- Locale: language, calendar, numbering system, timezone, offset.
- Display: screen metrics, screen frame, media preferences.
- Hardware: concurrency, memory, touch support, architecture byte pattern.
- Storage: cookies, localStorage, sessionStorage, IndexedDB, openDatabase, Do Not Track.
- Browser features: plugins, vendor globals, PDF viewer, Apple Pay, Private Click Measurement.
- Network: effective connection type, downlink, RTT, and data-saver state when exposed by the browser.
- Interference: DOM blocker bait checks.
- Fonts: FontFaceSet and iframe-isolated layout measurements.
- Media/graphics: audio latency, audio fingerprinting, WebGL renderer, WebGL extensions, WebGL shader precision, canvas checksums.
- Runtime math: deterministic JavaScript math behavior.

Bot detection is evidence-based. Strong signals such as WebDriver exposure, known automation globals, headless user agents, and impossible browser dimensions increase the score. Weaker inconsistencies such as language mismatches, impossible hardware ranges, plugin structure anomalies, patched permissions APIs, and empty Chromium globals are reported as evidence without being treated as proof by themselves.

Private-mode detection is intentionally conservative. Modern browsers do not expose a universal incognito flag, so `browser.privacyMode` reports likelihood, score, confidence, and evidence from storage availability, IndexedDB behavior, quota estimates, and persistence state.

## Privacy Profiles

- `strict`: low-sensitivity passive signals only.
- `balanced`: low- and medium-sensitivity passive signals for default product analytics.
- `extended`: active and high-sensitivity collectors for explicit security and fraud-prevention use cases.

Policy controls include consent gates, sensitivity limits, active collector permission, allow/deny lists, category filters, and optional value redaction.

## Reports And Demo

The browser demo in [examples/browser.html](examples/browser.html) renders two reports side by side:

- Compact report: concise identity, risk, quality, calculations, and every capability with status.
- Full report: raw SDK result, recalculated hash, derived calculations, and every component value/error.

Both reports include all collected capabilities and calculation data. Use the `extended` profile in the demo to exercise the full collector pack.

## Verification

`npm run verify` runs the full quality gate:

- build with esbuild;
- declaration validation through TypeScript;
- Node tests with 100% line, branch, and function coverage for `src/**/*.js`;
- Playwright browser tests in Chromium, Firefox, and WebKit;
- minified browser bundle size gate under 50 KB.

Additional docs:

- [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)
- [docs/VERSION_POLICY.md](docs/VERSION_POLICY.md)
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md)