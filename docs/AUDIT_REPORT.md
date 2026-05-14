# Repository Audit Report

## Scope

This audit covers FingerprintJS by BotBlocker source code, package metadata, generated browser builds, documentation, examples, tests, and CI configuration.

## Verified Quality Gates

- Build pipeline uses esbuild for ESM, CommonJS, and browser bundles.
- Runtime has no production dependencies.
- Runtime performs no network calls by default.
- TypeScript declarations are validated through package-level imports.
- Node tests enforce 100% line, branch, and function coverage for `src/**/*.js`.
- Browser tests run against Chromium, Firefox, and WebKit through Playwright.
- The minified browser bundle is checked against a 65 KB budget.
- CI runs install, browser setup, and `npm run verify` on push and pull request.
- Package publishing is guarded by `prepack` build and `prepublishOnly` verification scripts.
- npm package dry-run includes only intended package, build, docs, examples, security, license, and release files.

## Current Feature Coverage

- Deterministic visitor identity with canonical hash payloads.
- SHA-256 through Web Crypto or Node Crypto, plus deterministic fallback hashing.
- Privacy profiles: `strict`, `balanced`, `extended`.
- Consent gate and optional value redaction.
- Collector allow/deny and category allow/deny policy controls.
- Two-phase collector lifecycle with preparation and collection.
- Passive collector parallelism and active collector ordering.
- Storage state through browser localStorage or custom adapters.
- Debug formatting through `client.debug()` and `componentsToDebugString()`.
- Product-side ID recalculation through `hashComponents()`.
- Identity-safe hashing keeps report-only risk and volatile diagnostics out of the default visitor ID.
- `meta.identityComponents` and `meta.reportOnlyComponents` expose the exact hash/report split.
- Tamper evidence collector reports patched APIs and inconsistent runtime claims without entering the default identity hash.
- Backend verifier package supports replay protection, server-only hashing, client hash recomputation, explainable reports, and network risk adapters.
- Use-case policy presets cover privacy-first, analytics, login risk, checkout risk, bot defense, and fraud defense deployments.
- Stability monitor tracks baseline/current visitor IDs and identity/report-only drift.
- Script-tag global API through `FingerprintJSBotBlocker`.
- Compact and full browser demo reports with baseline/current visitor stability tracking.
- Standalone debug inspector for pasted result JSON.
- Three consistent demo output formats: compact report, dense ID analysis report, and full raw report.

## Built-In Signal Coverage

- Runtime and client hints.
- Navigator properties.
- API feature support and CSS feature support.
- Performance memory diagnostics.
- Bot and automation evidence.
- Tamper evidence.
- Private-mode indicators.
- Locale, date-time locale, and timezone.
- Screen metrics, screen frame, and media preferences.
- Hardware, touch, and architecture.
- Storage capabilities.
- Plugins, vendor flavors, PDF viewer, Apple Pay, and Private Click Measurement.
- Network connection diagnostics.
- DOM blocker bait checks.
- Font availability and preferences.
- Audio base latency and audio fingerprinting.
- WebGL renderer, extensions, and shader precision.
- Canvas checksum.
- JavaScript math behavior.

## Browser Stabilization

- Dedicated browser quirk detection layer.
- Safari, Firefox, Firefox iOS, iOS desktop mode, Chromium, and Samsung Internet handling.
- Suppression or normalization for known unstable audio, canvas, screen, and hardware paths.
- Canvas double-read detection for text rendering noise.
- Offline audio retry, timeout, suspended, and explicit unsupported/error statuses.
- Screen frame rounding plus resize/orientation cache backup.
- Expanded font candidates with iframe-isolated and normalized preference measurements.
- WebGL context attributes, GPU limits, viewport dimensions, extension filtering, and shader precision.
- Conservative private-mode reporting instead of unsupported universal incognito claims.
- Weak bot evidence is separated from strong automation evidence to reduce false-positive risk.

## BotBlocker Security Fit

FingerprintJS by BotBlocker is suitable as a client-side signal layer for [BotBlocker Security](https://botblocker.top). The generated report can be forwarded to a backend or BotBlocker Security workflow for risk scoring, bot defense, fraud prevention, and session integrity checks.

## Remaining Practical Work

1. Calibrate bot and private-mode scoring against real product traffic before automated enforcement.
2. Keep the 65 KB bundle budget under review as additional risk signals are added.
3. Add release automation with npm provenance when publishing credentials and release policy are defined.
4. Expand browser stability fixtures for product-specific flows and target browser versions.
5. Run a production observation window before changing default identity collector membership.
6. Connect the backend network adapter to a production IP intelligence provider before using proxy/VPN/datacenter evidence for enforcement.