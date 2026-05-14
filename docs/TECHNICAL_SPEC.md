# Technical Specification: Fingerprint Framework

## 1. Goal

Create a universal browser fingerprinting and device intelligence framework that looks and behaves like a mature SDK: modular architecture, extensible collectors, privacy policies, a stable npm build, and a standalone JavaScript file for direct page usage.

The solution must be broader than a single FingerprintJS-style algorithm. It should provide a managed platform for signals, quality scoring, consent policies, storage, and integration.

## 2. Product Principles

- Privacy by design: the library must not encourage hidden data collection. Active and high-sensitivity signals are controlled by the policy layer.
- Deterministic core: the same stable signals must produce the same `visitorId`.
- Framework feel: clear public API, declarations, documentation, examples, build scripts, and tests.
- Runtime portability: browser-first behavior with correct Node execution for tests and server-side scenarios.
- No hard dependencies: the base package must build and test without installing third-party packages.

## 3. Scope

Primary legitimate scenarios:

- account and transaction fraud protection;
- risk scoring for sign-in and payment flows;
- detection of suspicious browser or runtime changes;
- session quality analytics with consent awareness;
- product-specific collectors through the plugin API.

Constraints:

- do not design mechanisms to bypass anti-fingerprinting controls, private browsing modes, or user browser settings;
- do not hide signal collection from the integrating product;
- do not store cross-site identifiers by default.

## 4. Public Artifacts

The package must ship:

- `dist/index.mjs`: ESM build for bundlers and Node;
- `dist/collectors.mjs`: collector subpath build;
- `dist/policy.mjs`: policy subpath build;
- `dist/storage.mjs`: storage subpath build;
- `dist/index.d.ts`: TypeScript declarations;
- `dist/collectors.d.ts`, `dist/policy.d.ts`, `dist/storage.d.ts`: subpath declarations;
- `dist/browser/fingerprint-framework.js`: readable browser global build;
- `dist/browser/fingerprint-framework.min.js`: compact script-tag build;
- `docs/TECHNICAL_SPEC.md`: this technical specification;
- `examples/browser.html`: plain `<script>` usage example;
- `examples/node.mjs`: ESM usage example;
- `tests/*.test.mjs`: unit tests without external libraries.

## 5. Architecture

### 5.1 Core API

Main entry point:

```js
const client = await loadClient(options);
const result = await client.get(context);
```

`createClient` is responsible for:

- option normalization;
- collector selection;
- policy layer application;
- signal collection with timeout handling;
- canonical normalization;
- hash input construction;
- `visitorId` calculation;
- confidence scoring;
- optional storage state updates.

`loadClient(options, context)` creates a client and calls `prepare(context)`. `prepare()` waits for an idle browser moment when available, checks consent when required, prepares allowed collectors that expose a `prepare(context)` hook, and records `preparedAt`. Prepared values are reused by later `get()` / `identify()` calls. `get()` is an alias for `identify()` for FingerprintJS-style integrations.

### 5.2 Collector API

A collector is an independent signal source:

```js
createCollector({
  id: 'screen.metrics',
  version: '1',
  category: 'display',
  sensitivity: 'medium',
  mode: 'passive',
  stability: 'stable',
  weight: 1.2,
  prepare(context) {
    return context.screen ? { width: context.screen.width, height: context.screen.height } : null;
  },
  collect(context, prepared) {
    if (prepared) return prepared;
    return context.screen ? { width: context.screen.width, height: context.screen.height } : null;
  }
});
```

Collector requirements:

- `id` must be stable and unique;
- `collect` can be synchronous or asynchronous;
- optional `prepare` can preload expensive or timing-sensitive data;
- collector errors must not break the whole `identify` call;
- collector output passes through canonical normalization;
- high-sensitivity collectors are disabled by policy unless the selected profile allows them.

Collection scheduling:

- passive collectors run in parallel;
- active collectors run sequentially in declared order;
- disallowed collectors are represented as skipped components;
- preparation follows the same policy constraints and runs active preparations sequentially.

### 5.3 Policy Layer

The policy decides which collectors are allowed to run:

- `profile`: `strict`, `balanced`, `extended`;
- `requireConsent`: return a blocked result without collecting signals when consent is missing;
- `maxSensitivity`: upper sensitivity bound;
- `includeActive`: permission for active probes;
- `allowCollectors` / `denyCollectors`;
- `allowCategories` / `denyCategories`;
- `redactValues`: hide signal values in the result while retaining metadata.

### 5.4 Normalization and Hashing

Before hashing, all values are converted to canonical JSON:

- object keys are sorted;
- `undefined`, functions, and symbols are removed from objects;
- non-finite `NaN` / `Infinity` numbers become `null`;
- `Date` values become ISO strings;
- `BigInt` values become decimal strings.

Hash input includes:

- schema version;
- namespace;
- salt;
- collector versions;
- canonical values.

Algorithm:

- primary: SHA-256 through Web Crypto or Node Crypto;
- fallback: deterministic non-cryptographic hash for constrained runtimes, with explicit algorithm metadata.

`hashComponents(components, options, context)` exposes the same payload hashing logic for integrations that need to remove, keep, or inspect components before recalculating an identifier.

### 5.5 Confidence Scoring

`confidence` should describe result quality, not promise absolute uniqueness:

- `score`: 0..1;
- `level`: `low`, `medium`, `high`;
- `collectedWeight`: total weight of successfully collected signals;
- `possibleWeight`: total weight of allowed collectors;
- `entropy`: approximate usefulness estimate for the collected signal set.

### 5.6 Storage

Storage is disabled by default. Available options:

- `storage: false`: stateless fingerprint only;
- `storage: 'local'`: browser `localStorage`;
- custom storage with `get(key)` and `set(key, value)` methods.

Storage keeps only project-namespaced visit state: `firstSeenAt`, `lastSeenAt`, `seenCount`, and `visitorId`.

## 6. Built-in Collectors

Minimum set:

- `runtime.browser`: user agent, platform, vendor, webdriver, UA Client Hints basic data;
- `runtime.clientHints`: high-entropy UA Client Hints when the browser exposes them;
- `runtime.navigatorProperties`: vendor, vendorSub, product, productSub, oscpu, cpuClass, build identifier;
- `runtime.node`: Node version/platform/arch for server and test runtimes;
- `locale`: language, languages, Intl locale;
- `locale.datetime`: calendar, numbering system, hour cycle;
- `timezone`: timezone, timezone offset;
- `screen.metrics`: screen size, color depth, DPR;
- `screen.frame`: browser chrome/frame metrics with unstable Safari/Firefox paths suppressed;
- `display.mediaPreferences`: color gamut, forced/inverted colors, contrast, motion, transparency, HDR, monochrome;
- `hardware`: concurrency, device memory, touch points, with Firefox 143+ and RFP-like concurrency values normalized into stable tiers;
- `hardware.touch`: touch event and pointer media-query support;
- `hardware.architecture`: typed-array architecture byte pattern;
- `storage.capabilities`: cookies, IndexedDB, localStorage/sessionStorage, openDatabase, Do Not Track;
- `browser.plugins`: plugins and MIME types;
- `browser.vendorFlavors`: browser-specific global markers;
- `browser.pdfViewer`: native PDF viewer flag;
- `browser.applePay`: Apple Pay API availability state;
- `browser.privateClickMeasurement`: WebKit Private Click Measurement marker;
- `browser.domBlockers`: expanded local DOM bait checks for content blocker signals, active and volatile;
- `fonts.available`: font availability through FontFaceSet or iframe-isolated layout measurement, active and volatile;
- `fonts.preferences`: default font metrics, active and volatile;
- `audio.baseLatency`: AudioContext latency and sample-rate metadata with unstable browser suppression;
- `audio.fingerprint`: OfflineAudioContext checksum with unstable browser suppression;
- `webgl.renderer`: WebGL vendor/renderer data, high sensitivity, active;
- `webgl.extensions`: WebGL extensions and limits, high sensitivity, active;
- `canvas.checksum`: geometry/text canvas checksum with known randomization suppression, high sensitivity, active;
- `math.fingerprint`: deterministic JavaScript math behavior.

Collectors that touch layout, graphics, audio, or blocker baits are marked active and are disabled unless the policy allows active collection.

## 7. Public Result Shape

`identify()` returns:

```js
{
  visitorId: 'hex-or-null',
  requestId: 'uuid-like-id',
  namespace: 'product-namespace',
  createdAt: 'ISO date',
  confidence: { score, level, entropy, collectedWeight, possibleWeight },
  components: [
    { id, version, category, sensitivity, status, value, durationMs }
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

`componentsToDebugString(components)` and `client.debug(context)` produce a stable human-readable diagnostic dump for support and integration debugging.

## 8. Quality Bar

The implementation must pass:

- `npm run build` using esbuild;
- `npm run typecheck` for package declarations;
- `npm test` for Node unit tests;
- `npm run test:coverage` with 100% line, branch, and function thresholds for `src/**/*.js`;
- `npm run test:browser` for Chromium, Firefox, and WebKit;
- `npm run check:size` for the minified browser bundle budget;
- `npm run verify`.

Tests must cover:

- canonical normalization;
- deterministic hashing;
- policy filtering;
- consent gate;
- deterministic visitor IDs for custom collectors;
- redaction mode;
- storage state updates;
- built-in collector happy paths and failure paths;
- browser bundle global API smoke tests;
- package self-reference imports and subpath imports.

The browser bundle size gate is set to 45 KB for `dist/browser/fingerprint-framework.min.js` after the expanded collector pack.

## 9. Post-MVP Roadmap

- Dedicated risk engine over collected signals.
- Async plugin registry.
- Preset collector package for fraud and risk scoring.
- Product-specific real-browser stability fixtures across repeated runs, private contexts where automation supports them, and CSS interference cases.
