# Technical Overview: FingerprintJS by BotBlocker

FingerprintJS by BotBlocker is a client-side signal collection SDK for device intelligence, bot-defense, fraud-risk scoring, and BotBlocker Security integrations.

The SDK can run as an ESM package or as a standalone browser script. It does not make runtime network calls by default. Host applications can forward the generated report to [BotBlocker Security](https://botblocker.top), their own backend, or any risk pipeline.

## Public Builds

- `dist/index.mjs`: main ESM API.
- `dist/index.cjs`: main CommonJS API.
- `dist/collectors.mjs`: collector factory subpath.
- `dist/collectors.cjs`: CommonJS collector factory subpath.
- `dist/policy.mjs`: policy subpath.
- `dist/policy.cjs`: CommonJS policy subpath.
- `dist/server.mjs`: backend verification subpath.
- `dist/server.cjs`: CommonJS backend verification subpath.
- `dist/storage.mjs`: storage subpath.
- `dist/storage.cjs`: CommonJS storage subpath.
- `dist/browser/fingerprintjs-botblocker.js`: readable browser global build.
- `dist/browser/fingerprintjs-botblocker.min.js`: minified script-tag build.
- `dist/*.d.ts`: TypeScript declarations for public package entry points.

## Runtime Model

Main integration flow:

```js
const client = await loadClient({
  namespace: 'product-or-domain',
  profile: 'extended'
});

const result = await client.get({
  consent: { granted: true, purpose: 'security' }
});
```

`loadClient()` creates a client and calls `prepare()`. Preparation waits for an idle browser moment when available, checks consent when required, and preloads allowed collectors that expose `prepare(context)`.

Collection rules:

- passive collectors run in parallel;
- active collectors run sequentially in declared order;
- disallowed collectors are returned as skipped components;
- collector errors and timeouts are isolated to component metadata;
- prepared values are reused by later `get()` / `identify()` calls.

## Policy Profiles

- `strict`: low-sensitivity passive signals only.
- `balanced`: low- and medium-sensitivity passive signals.
- `extended`: active and high-sensitivity signals for explicit security or fraud-prevention use.

Policy options support consent gates, sensitivity limits, active collector control, unstable collector control, collector/category allow lists, collector/category deny lists, and optional value redaction.

Identity options are independent from collection policy:

- `identity.includeNonHashable`: include report-only components in the hash when a deployment intentionally wants an all-signals identifier.
- `identity.allowCollectors`: restrict hash inputs to a specific collector ID allow list.
- `identity.denyCollectors`: exclude specific collector IDs from the hash.

The default identity mode only hashes components whose collector is `hashable: true`. Volatile, risk, diagnostics, and capability signals can still be collected and returned without moving the stable visitor ID.

Use-case presets combine profile, policy, and identity defaults for common deployments: `privacy-first`, `analytics-lite`, `login-risk`, `checkout-risk`, `bot-defense`, and `fraud-defense`.

## Result Shape

`identify()` / `get()` returns:

```js
{
  visitorId,
  requestId,
  namespace,
  createdAt,
  confidence: {
    score,
    level,
    entropy,
    collectedWeight,
    possibleWeight,
    platformScore,
    collectionQuality: {
      score,
      level,
      collectedWeight,
      possibleWeight
    }
  },
  components: [
    {
      id,
      version,
      category,
      sensitivity,
      mode,
      stability,
      hashable,
      weight,
      status,
      value,
      durationMs,
      error
    }
  ],
  meta: {
    version,
    schemaVersion,
    profile,
    durationMs,
    hashAlgorithm,
    identityComponents,
    reportOnlyComponents,
    blocked,
    reason,
    storage
  }
}
```

The browser demo additionally derives compact, ID analysis, and full reports from this result:

- Compact report: concise identity, risk, quality, hash checks, calculations, stability, and every capability with role, hashability, status, weight, duration, value summary, and error state.
- ID analysis report: shortest dense scoring format from `createAnalysisReport()`. It includes visitor ID, request metadata, confidence, aggregate weights, hash checks, risk verdicts, and every component's role, status, weight, raw result, and error.
- Full report: raw `IdentifyResult`, recalculated hash, all-signals hash, derived calculations, stability data, explainable report, ID analysis report, and every component value/error.

All three demo outputs are derived from the same `IdentifyResult`, so component counts, identity/report-only roles, hash checks, and risk summaries stay consistent across formats.

## Hashing And Identity

Before hashing, component values are canonicalized:

- object keys are sorted;
- unsupported object values are omitted;
- non-finite numbers become `null`;
- dates become ISO strings;
- BigInt values become decimal strings.

Default hash payload data:

- schema version;
- namespace;
- optional salt;
- identity-safe component versions;
- canonical identity-safe component values.

The `visitorId` excludes report-only components by default. `browser.botDetection`, `browser.privacyMode`, `network.connection`, `performance.memory`, `storage.capabilities`, `browser.applePay`, `browser.privateClickMeasurement`, and `browser.domBlockers` are examples of useful report signals that should not change identity by default.

Hash algorithms:

- Web Crypto SHA-256 when available;
- Node Crypto SHA-256 when available;
- deterministic fallback hash for constrained runtimes.

`hashComponents(components, options, context)` exposes the same hashing path for product-side filtering, lazy hashing, and report verification. It defaults to identity-safe components and supports `includeNonHashable`, `allowCollectors`, and `denyCollectors` for diagnostics or custom identity policy.

## Browser Stability Model

Known unstable sources are suppressed or normalized before they can affect identity:

- Browser quirks: feature-assisted engine detection for Chromium, WebKit, Gecko, Safari, Firefox, iOS desktop mode, Android, and Samsung Internet.
- Canvas: deterministic drawing plus double-read detection for text canvas noise.
- Audio: offline render retry, timeout, suspended, unsupported, and error statuses.
- Screen frame: rounded dimensions, fullscreen detection, resize/orientation cache backup, and known browser suppressions.
- Fonts: expanded candidate list, iframe-isolated measurement, normalized widths, and preference presets.
- WebGL: context attributes, drawing buffer size, renderer strings, extension filtering for noisy debug/timer extensions, limits, viewport dimensions, and shader precision.

## Backend Verification Model

The `@botblocker/fingerprintjs/server` subpath is backend-oriented and is not part of the script-tag global bundle. It provides:

- replay tokens with nonce, expiry, purpose, and server-secret signature;
- memory replay store for tests and small deployments;
- server-only visitor hashing with a secret salt;
- result verification that recomputes the client hash from components;
- explainable report generation for backend logs;
- network risk adapter support for proxy, VPN, Tor, hosting, and datacenter evidence.

The network adapter intentionally does not make built-in network calls. Host applications provide their own IP intelligence source and pass normalized flags into `evaluateNetworkRisk()` or `verifyFingerprintResult()`.

## Public Report APIs

- `createExplainableReport(result, options)`: produces a readable report with identity/report-only reasons, risk summaries, and optional component values.
- `createAnalysisReport(result, options)`: produces the shortest dense scoring report with ID, confidence, aggregate weights, optional hash checks, risk verdicts, and raw component results.
- `explainComponent(component, identityComponents, options)`: explains a single component role and reason.
- [examples/inspector.html](../examples/inspector.html) accepts raw `IdentifyResult`, full demo report JSON, and ID analysis report JSON for local debugging.

## Browser Support Matrix

- Chromium desktop and Android: full passive support, active collectors available when profile and policy allow them.
- Firefox desktop: full passive support, with canvas/screen suppression for known resist-fingerprinting and newer randomized paths.
- Safari desktop and iOS/WebKit: passive support plus conservative suppression for unstable audio/canvas/screen behavior.
- Samsung Internet: Chromium-derived support with audio suppression for known unstable versions.
- Node.js 18+: package imports, CommonJS requires, custom collectors, hashing, storage adapters, and Node runtime signals. Browser-only collectors return empty or unsupported values without requiring browser globals at import time.

## Built-In Collectors

Runtime:

- `runtime.browser`
- `runtime.clientHints`
- `runtime.navigatorProperties`
- `browser.apiFeatures`
- `browser.cssFeatures`
- `performance.memory`
- `runtime.node`

Risk and privacy:

- `browser.botDetection`
- `browser.privacyMode`
- `browser.tamperEvidence`

Locale and time:

- `locale`
- `locale.datetime`
- `timezone`

Display:

- `screen.metrics`
- `screen.frame`
- `display.mediaPreferences`

Hardware:

- `hardware`
- `hardware.touch`
- `hardware.architecture`

Storage and browser capabilities:

- `storage.capabilities`
- `browser.plugins`
- `browser.vendorFlavors`
- `browser.pdfViewer`
- `browser.applePay`
- `browser.privateClickMeasurement`
- `browser.domBlockers`

Network:

- `network.connection`

Fonts, media, graphics, and math:

- `fonts.available`
- `fonts.preferences`
- `audio.baseLatency`
- `audio.fingerprint`
- `webgl.renderer`
- `webgl.extensions`
- `webgl.precision`
- `canvas.checksum`
- `math.fingerprint`

## BotBlocker Security Pairing

FingerprintJS by BotBlocker is the client signal layer. BotBlocker Security can use the report server-side to combine visitor identity, bot evidence, private-mode likelihood, browser capabilities, and product-specific risk signals.

Recommended backend payload:

- `visitorId`
- `requestId`
- `namespace`
- `createdAt`
- `confidence`
- `meta`
- `components`
- compact report summary from the demo formatter, when useful for logs or dashboards.
- server verification report when replay, server hash, or network risk checks are enabled.

## Bot And Private-Mode Semantics

`browser.botDetection` returns a scored verdict with evidence. It includes strong automation evidence and weak consistency checks for language lists, hardware ranges, plugin structure, permissions API shape, and Chromium globals. It is not a CAPTCHA replacement; it is a signal component for risk systems.

`browser.privacyMode` returns conservative indicators. Browsers intentionally avoid exposing a universal private-mode flag, so the SDK reports `likely_private`, `possible_private`, `no_private_evidence`, or `unsupported` with score, confidence, and evidence.

## Quality Gate

`npm run verify` runs:

- build;
- TypeScript declaration validation;
- Node tests with 100% line, branch, and function coverage for `src/**/*.js`;
- Playwright tests in Chromium, Firefox, and WebKit;
- minified browser bundle size check under 65 KB.