# Fingerprint Framework

An advanced browser fingerprinting and device intelligence framework focused on modularity, privacy controls, and production-friendly distribution as both an npm package and a standalone browser script.

The project intentionally has no external runtime dependencies. It ships an ESM API, script-tag builds, TypeScript declarations, `node:test` coverage, and a predictable build pipeline.

## Quick Start

```bash
npm run verify
```

### ESM

```js
import { loadClient } from '@fingerprint-framework/core';

const client = await loadClient({
  namespace: 'my-product',
  profile: 'balanced'
});

const result = await client.get({
  consent: { granted: true, purpose: 'fraud-prevention' }
});

console.log(result.visitorId, result.confidence.score);
```

### Standalone Browser Script

After building, include the generated file directly:

```html
<script src="./dist/browser/fingerprint-framework.min.js"></script>
<script>
  const client = FingerprintFramework.createClient({
    namespace: location.hostname,
    profile: 'balanced'
  });

  client.prepare().then(() => client.get({ consent: { granted: true } })).then((result) => {
    console.log(result.visitorId, result.confidence);
  });
</script>
```

## Privacy Profiles

- `strict`: low-sensitivity passive signals only.
- `balanced`: low- and medium-sensitivity passive signals, suitable as the default product profile.
- `extended`: includes active and high-sensitivity collectors such as canvas and WebGL, intended only for explicit product need and consent.

## Capabilities

- Collector API for custom signals.
- Policy layer with allow/deny collectors, categories, sensitivity limits, and consent gates.
- Deterministic canonical normalization before hashing.
- Browser quirk detection for known unstable Safari, Firefox, iOS, Chromium, and Samsung Internet paths.
- Expanded built-in collectors for client hints, screen frame, media preferences, touch, architecture, plugins, vendor flavors, PDF viewer, Apple Pay, Private Click Measurement, DOM blockers, fonts, audio, WebGL extensions, canvas, and math behavior.
- SHA-256 via Web Crypto or Node Crypto, with fallback support for constrained runtimes.
- Confidence scoring and collector error metadata.
- Optional visit state storage through `localStorage` or a custom adapter.
- `loadClient()` / `prepare()` / `get()` flow for startup warmup and faster later identification.
- `componentsToDebugString()` and `client.debug()` for human-readable diagnostics.
- Script-tag global API: `FingerprintFramework`.

## Package Subpaths

```js
import { createDefaultCollectors } from '@fingerprint-framework/core/collectors';
import { createPolicy } from '@fingerprint-framework/core/policy';
import { createMemoryStorage } from '@fingerprint-framework/core/storage';
```

## Build And Verification

- Source files live in focused modules under `src/`.
- `npm run build` bundles package entry points and browser scripts with esbuild.
- `npm run typecheck` validates published declaration files through package imports.
- `npm run test:coverage` enforces 100% line, branch, and function coverage for `src/**/*.js`.
- `npm run test:browser` runs the standalone browser build in Chromium, Firefox, and WebKit.
- `npm run check:size` enforces the browser minified bundle size budget, currently 45 KB for the expanded collector pack.

The technical specification is available in [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md). The identifier version policy is available in [docs/VERSION_POLICY.md](docs/VERSION_POLICY.md). The current implementation audit is available in [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md).
