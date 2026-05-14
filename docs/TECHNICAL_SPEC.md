# Technical Overview: FingerprintJS by BotBlocker

FingerprintJS by BotBlocker is a client-side signal collection SDK for device intelligence, bot-defense, fraud-risk scoring, and BotBlocker Security integrations.

The SDK can run as an ESM package or as a standalone browser script. It does not make runtime network calls by default. Host applications can forward the generated report to [BotBlocker Security](https://botblocker.top), their own backend, or any risk pipeline.

## Public Builds

- `dist/index.mjs`: main ESM API.
- `dist/collectors.mjs`: collector factory subpath.
- `dist/policy.mjs`: policy subpath.
- `dist/storage.mjs`: storage subpath.
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
    possibleWeight
  },
  components: [
    {
      id,
      version,
      category,
      sensitivity,
      mode,
      stability,
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
    blocked,
    reason,
    storage
  }
}
```

The browser demo additionally derives compact and full reports from this result. Both reports include identity, risk, quality, timing, hash recalculation, storage state, component totals, status counts, sensitivity counts, mode counts, category counts, and every capability status.

## Hashing And Identity

Before hashing, component values are canonicalized:

- object keys are sorted;
- unsupported object values are omitted;
- non-finite numbers become `null`;
- dates become ISO strings;
- BigInt values become decimal strings.

Hash payload data:

- schema version;
- namespace;
- optional salt;
- component versions;
- canonical component values.

Hash algorithms:

- Web Crypto SHA-256 when available;
- Node Crypto SHA-256 when available;
- deterministic fallback hash for constrained runtimes.

`hashComponents(components, options, context)` exposes the same hashing path for product-side filtering and report verification.

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

## Bot And Private-Mode Semantics

`browser.botDetection` returns a scored verdict with evidence. It includes strong automation evidence and weak consistency checks for language lists, hardware ranges, plugin structure, permissions API shape, and Chromium globals. It is not a CAPTCHA replacement; it is a signal component for risk systems.

`browser.privacyMode` returns conservative indicators. Browsers intentionally avoid exposing a universal private-mode flag, so the SDK reports `likely_private`, `possible_private`, `no_private_evidence`, or `unsupported` with score, confidence, and evidence.

## Quality Gate

`npm run verify` runs:

- build;
- TypeScript declaration validation;
- Node tests with 100% line, branch, and function coverage for `src/**/*.js`;
- Playwright tests in Chromium, Firefox, and WebKit;
- minified browser bundle size check under 50 KB.