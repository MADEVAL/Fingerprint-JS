# Implementation Audit Report

## Scope

This audit covers the current repository state: package metadata, source runtime, generated browser builds, examples, documentation, and automated tests.

## Verified Results

- The package has no production dependencies.
- The runtime exposes an ESM API and a script-tag global API.
- The build uses esbuild and creates `dist/index.mjs`, subpath ESM builds, TypeScript declaration files, `dist/browser/fingerprint-framework.js`, and `dist/browser/fingerprint-framework.min.js`.
- The Node test command uses the Node test runner, and browser tests use Playwright across Chromium, Firefox, and WebKit.
- The coverage command enforces 100% line, branch, and function coverage for `src/**/*.js`.
- There are no network calls in the runtime implementation.
- CI is configured through GitHub Actions for Node LTS and current Node.
- A 45 KB bundle size budget is enforced for `dist/browser/fingerprint-framework.min.js`.
- Type declarations are validated by TypeScript through package-level imports.

## Current Strengths

- Privacy profiles are explicit and deny active high-sensitivity collectors by default.
- Collector failures are isolated and reported as component metadata.
- Hash input is canonicalized before hashing.
- Storage is disabled by default and scoped by namespace when enabled.
- The standalone browser build is smoke-tested through a restricted VM context.
- Source files are split by responsibility while published builds remain bundled for package and script-tag usage.
- Built-in collectors now cover substantially more browser entropy: client hints, navigator properties, screen frame, media preferences, touch, architecture, storage capabilities, plugins, vendor flavors, PDF viewer, Apple Pay, Private Click Measurement, DOM blockers, fonts, audio latency, audio fingerprinting, WebGL extensions, canvas, and math behavior.
- Known unstable browser paths are handled through a dedicated quirk layer before collecting audio, canvas, screen metrics, screen frame, and hardware concurrency signals.
- `loadClient()`, `prepare()`, `get()`, `hashComponents()`, `client.debug()`, and `componentsToDebugString()` provide a more mature integration and diagnostics flow.
- Collector preparation now preloads allowed sources, reuses prepared values, and respects consent requirements when configured.
- Collection scheduling runs passive sources in parallel and active sources in declared order.
- Font layout probing uses iframe isolation when available.
- DOM blocker probing covers an expanded set of local bait categories.

## Implemented Improvements

- Added `.github/workflows/ci.yml` with `npm ci`, Playwright browser installation, and `npm run verify`.
- Added Playwright browser tests for Chromium, Firefox, and WebKit.
- Replaced the local minifier with esbuild for bundling and minification.
- Added TypeScript declaration validation through `npm run typecheck`.
- Added a bundle size gate through `npm run check:size`.
- Added subpath exports for `./collectors`, `./policy`, and `./storage`.
- Split built-in collectors into domain modules under `src/collectors/`.
- Added `src/browser-quirks.js` for conservative browser-specific stabilization decisions.
- Added a collector preparation lifecycle with active-source ordering.
- Added public `hashComponents()` for product-side component filtering and ID recalculation.
- Added navigator property and audio base latency collectors.
- Added iframe-isolated font measurement and expanded DOM blocker baits.
- Added `docs/VERSION_POLICY.md` for visitor identifier compatibility expectations.
- Raised the bundle size budget from 30 KB to 45 KB after expanding the built-in collector pack.

## Remaining Practical Work

1. Keep the 45 KB bundle budget under review as collectors are added.
2. Add release automation only when publishing credentials and release policy are defined.
3. Expand real-browser tests with product-specific integration fixtures when those flows exist.
