# FingerprintJS by BotBlocker

[![npm](https://img.shields.io/npm/v/@globus.studio/fingerprintjs)](https://www.npmjs.com/package/@globus.studio/fingerprintjs)
[![Build](https://img.shields.io/badge/build-verified-brightgreen)](.github/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](package.json)
[![Browser Bundle](https://img.shields.io/badge/browser%20bundle-%3C65KB-blue)](scripts/check-size.mjs)
[![Runtime](https://img.shields.io/badge/runtime-no%20production%20deps-success)](package.json)
[![BotBlocker Security](https://img.shields.io/badge/BotBlocker-Security-0f766e)](https://botblocker.top)

FingerprintJS by BotBlocker is a browser fingerprinting and device intelligence SDK for risk, fraud, and bot-defense workflows. It is designed to pair with [BotBlocker Security](https://botblocker.top) while remaining usable as a standalone ESM package or a direct script-tag bundle.

This library powers device identification in the [BotBlocker Security plugin for WordPress](https://wordpress.org/plugins/botblocker-security) — a comprehensive protection suite for WordPress sites.

The runtime has no production dependencies, performs no network calls by default, and exposes privacy-aware collector policies, deterministic identity hashing, report-only risk signals, bot evidence, private-mode indicators, confidence scoring, storage state, and compact diagnostics.

## Install

```bash
npm install @globus.studio/fingerprintjs
```

## Core Advantages

- Stable visitor identity is separated from risk and diagnostic evidence. Volatile, bot, private-mode, tamper, storage, network, and capability signals can enrich reports without changing the default `visitorId`.
- Backend verification is included through `@globus.studio/fingerprintjs/server`: replay protection, client hash recomputation, server-only hashing, explainable backend reports, and pluggable network risk checks.
- Tamper, bot, and private-mode evidence is returned as scored, explainable signals instead of a single opaque identifier.
- Use-case presets provide practical defaults for privacy-first analytics, login risk, checkout risk, bot defense, and fraud defense.
- The SDK is self-hostable, dependency-free at runtime, works through ESM, CommonJS, and a direct script tag, and performs no network calls unless the host application sends results to its own backend.
- Output formats cover product integration, backend scoring, and debugging: compact report, dense ID analysis report, full raw report, and standalone JSON inspector.

## Build (for contributors)

```bash
npm ci
npm run verify
```

Generated browser builds:

- `dist/browser/fingerprintjs-botblocker.js`
- `dist/browser/fingerprintjs-botblocker.min.js`

Package entry points:

- `@globus.studio/fingerprintjs`
- `@globus.studio/fingerprintjs/collectors`
- `@globus.studio/fingerprintjs/policy`
- `@globus.studio/fingerprintjs/server`
- `@globus.studio/fingerprintjs/storage`

Each package entry supports ESM `import` and CommonJS `require`. Browser builds expose the `FingerprintJSBotBlocker` global.

## ESM Usage

```js
import { createAnalysisReport, hashComponents, loadClient } from '@globus.studio/fingerprintjs';

const client = await loadClient({
  namespace: 'my-product',
  useCase: 'fraud-defense',
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
const analysis = createAnalysisReport(result, { recalculatedHash: recalculated });

console.log({
  visitorId: result.visitorId,
  bot: bot?.value?.verdict,
  privateMode: privacy?.value?.verdict,
  confidence: result.confidence,
  hashMatches: recalculated.visitorId === result.visitorId,
  analysis
});
```

## CommonJS Usage

```js
const { createClient } = require('@globus.studio/fingerprintjs');

const client = createClient({
  namespace: 'node-service',
  collectors: [],
  storage: false
});
```

## Backend Verification

The server package adds replay protection, server-only hashing, result verification, and network risk adapters. It is intended for backend use and is not included in the browser global bundle.

```js
import {
  createMemoryReplayStore,
  createReplayToken,
  verifyFingerprintResult
} from '@globus.studio/fingerprintjs/server';

const replayStore = createMemoryReplayStore();
const replayToken = await createReplayToken({
  secret: process.env.FINGERPRINT_SERVER_SECRET,
  purpose: 'login-risk'
});

const verification = await verifyFingerprintResult(resultFromBrowser, {
  secret: process.env.FINGERPRINT_SERVER_SECRET,
  replayToken,
  replayStore,
  network: { ip: request.ip },
  networkAdapter: yourIpRiskAdapter
});

if (!verification.ok || verification.network?.verdict === 'high_risk_network') {
  // Increase friction, deny the request, or send the event to BotBlocker Security.
}
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
- Integrity: tamper evidence for patched browser APIs and inconsistent runtime claims.
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

Tamper evidence is also evidence-based. `browser.tamperEvidence` reports patched native APIs, platform/client-hints mismatches, zero screen dimensions, suspicious language lists, and patched canvas serialization. It is report-only by default and should be combined with server verification before enforcement.

Private-mode detection is intentionally conservative. Modern browsers do not expose a universal incognito flag, so `browser.privacyMode` reports likelihood, score, confidence, and evidence from storage availability, IndexedDB behavior, quota estimates, and persistence state.

## Privacy Profiles

- `strict`: low-sensitivity passive signals only.
- `balanced`: low- and medium-sensitivity passive signals for default product analytics.
- `extended`: active and high-sensitivity collectors for explicit security and fraud-prevention use cases.

Policy controls include consent gates, sensitivity limits, active collector permission, allow/deny lists, category filters, and optional value redaction.

Use-case presets are available through `useCase` or `createUseCasePreset()`:

- `privacy-first`
- `analytics-lite`
- `login-risk`
- `checkout-risk`
- `bot-defense`
- `fraud-defense`

Identity controls are separate from policy controls:

- `identity.includeNonHashable`: include report-only components in the hash for diagnostics or custom deployments.
- `identity.allowCollectors`: restrict identity hashing to a specific collector ID set.
- `identity.denyCollectors`: exclude specific collector IDs from identity hashing.

Collection confidence and identity confidence are both exposed. `confidence.score` reflects identity completeness adjusted by platform stability. `confidence.collectionQuality` reports how much of the allowed collector set succeeded, including report-only sources.

## Reports And Demo

The browser demo in [examples/browser.html](examples/browser.html) renders three reports side by side and tracks repeated runs:

- Compact report: concise identity, risk, quality, calculations, and every capability with status, role, hashability, weight, duration, value summary, and error state.
- ID analysis report: shortest dense format for backend scoring. It is rendered as readable JSON and contains `id`, request metadata, compact confidence, totals, aggregate weights, `weights.byComponent`, hash checks, risk verdicts, identity/report-only lists, and short `results` summaries keyed by component ID.
- Full report: raw SDK result, recalculated hash, all-signals hash, derived calculations, stability data, explainable report, ID analysis report, and every component value/error.
- Stability view: baseline visitor ID, current visitor ID, identity input count, report-only count, changed identity/report-only components, and recent run history.

All demo outputs are generated from the same `IdentifyResult` and are ordered by verbosity: ID analysis, compact report, then full report. The compact format includes every collected capability with readable summaries. The ID analysis format keeps every component represented through weight and result maps without dumping raw component objects. The full format additionally embeds the raw result and explainable report. Use the `extended` profile in the demo to exercise the full collector pack and confirm that report-only changes do not move the stable visitor ID.

See [docs/REPORT_FORMATS.md](docs/REPORT_FORMATS.md) for a field-by-field interpretation guide with one sentence per field.

The debug inspector in [examples/inspector.html](examples/inspector.html) accepts an `IdentifyResult`, full demo report JSON, or ID analysis report JSON and explains identity components, report-only components, tamper, bot, and private-mode evidence.

## Verification

`npm run verify` runs the full quality gate:

- build with esbuild;
- declaration validation through TypeScript;
- Node tests with 100% line, branch, and function coverage for `src/**/*.js`;
- Playwright browser tests in Chromium, Firefox, and WebKit;
- minified browser bundle size gate under 65 KB.

Additional docs:

- [CHANGELOG.md](CHANGELOG.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)
- [docs/REPORT_FORMATS.md](docs/REPORT_FORMATS.md)
- [docs/VERSION_POLICY.md](docs/VERSION_POLICY.md)
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md)
- [docs/PUBLISHING.md](docs/PUBLISHING.md)

---

## License

MIT. See [LICENSE](LICENSE).