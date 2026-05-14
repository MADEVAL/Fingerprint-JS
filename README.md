# FingerprintJS by BotBlocker

[![Build](https://img.shields.io/badge/build-verified-brightgreen)](.github/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](package.json)
[![Browser Bundle](https://img.shields.io/badge/browser%20bundle-%3C55KB-blue)](scripts/check-size.mjs)
[![Runtime](https://img.shields.io/badge/runtime-no%20production%20deps-success)](package.json)
[![BotBlocker Security](https://img.shields.io/badge/BotBlocker-Security-0f766e)](https://botblocker.top)

FingerprintJS by BotBlocker is a browser fingerprinting and device intelligence SDK for risk, fraud, and bot-defense workflows. It is designed to pair with [BotBlocker Security](https://botblocker.top) while remaining usable as a standalone ESM package or a direct script-tag bundle.

The runtime has no production dependencies, performs no network calls by default, and exposes privacy-aware collector policies, deterministic identity hashing, report-only risk signals, bot evidence, private-mode indicators, confidence scoring, storage state, and compact diagnostics.

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

Each package entry supports ESM `import` and CommonJS `require`. Browser builds expose the `FingerprintJSBotBlocker` global.

## ESM Usage

```js
import { hashComponents, loadClient } from '@botblocker/fingerprintjs';

const client = await loadClient({
  namespace: 'my-product',
  profile: 'extended',
  storage: 'local',
  identity: {
    denyCollectors: ['browser.botDetection', 'browser.privacyMode'],
    includeNonHashable: false
  }
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

## CommonJS Usage

```js
const { createClient } = require('@botblocker/fingerprintjs');

const client = createClient({
  namespace: 'node-service',
  collectors: [],
  storage: false
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

Identity and report-only data are deliberately separated:

- `component.hashable === true`: eligible for the stable `visitorId` hash when policy and identity options allow it.
- `component.hashable === false`: collected for risk, diagnostics, and reports, but excluded from `visitorId` by default.
- `result.meta.identityComponents`: exact component IDs used for the current `visitorId`.
- `result.meta.reportOnlyComponents`: ok components collected for reporting but not used for the current `visitorId`.

The default collector pack keeps volatile and risk-oriented sources such as bot evidence, private-mode indicators, network connection, performance memory, storage capabilities, payment availability, private click measurement, and DOM blocker checks out of the identity hash. This keeps repeated identifications stable while still returning the signals needed for enforcement decisions.

`hashComponents()` follows the same identity-safe default. Pass `includeNonHashable: true` only when intentionally comparing an all-signals diagnostic hash.

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

Identity controls are separate from policy controls:

- `identity.includeNonHashable`: include report-only components in the hash for diagnostics or custom deployments.
- `identity.allowCollectors`: restrict identity hashing to a specific collector ID set.
- `identity.denyCollectors`: exclude specific collector IDs from identity hashing.

Collection confidence and identity confidence are both exposed. `confidence.score` reflects identity completeness adjusted by platform stability. `confidence.collectionQuality` reports how much of the allowed collector set succeeded, including report-only sources.

## Reports And Demo

The browser demo in [examples/browser.html](examples/browser.html) renders two reports side by side and tracks repeated runs:

- Compact report: concise identity, risk, quality, calculations, and every capability with status.
- Full report: raw SDK result, recalculated hash, derived calculations, and every component value/error.
- Stability view: baseline visitor ID, current visitor ID, identity input count, report-only count, changed identity/report-only components, and recent run history.

Both reports include all collected capabilities and calculation data. Use the `extended` profile in the demo to exercise the full collector pack and confirm that report-only changes do not move the stable visitor ID.

## Verification

`npm run verify` runs the full quality gate:

- build with esbuild;
- declaration validation through TypeScript;
- Node tests with 100% line, branch, and function coverage for `src/**/*.js`;
- Playwright browser tests in Chromium, Firefox, and WebKit;
- minified browser bundle size gate under 55 KB.

Additional docs:

- [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)
- [docs/VERSION_POLICY.md](docs/VERSION_POLICY.md)
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md)