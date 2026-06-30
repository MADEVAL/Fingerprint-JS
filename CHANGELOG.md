# Changelog

All notable changes to FingerprintJS by BotBlocker are documented here.

## 0.2.0 - 2026-07-01

### Changed

- **Breaking**: browser bundle files renamed from `fingerprintjs-botblocker.js` to `fingerprintjs.js`.
- Package scope renamed from `@botblocker` to `@globus.studio`.
- README updated with npm badge, install section, CDN links (unpkg, jsdelivr).

### Added

- `.gitattributes` to enforce LF line endings.
- `.gitignore` extended with `.env`, `.vscode/`, `.idea/`, `Thumbs.db`, `*.tsbuildinfo`.

### Fixed

- Consolidated duplicate utility functions (`safeNumber`, `safeBoolean`, `createCheck`, `roundScore`) into `collectors/shared.js`.
- `graphics.js` now imports `safeBoolean` from `shared.js` instead of redefining it.

### Removed

- `alien/` directory — legacy detection scripts superseded by the collector architecture.

## 0.1.1 - 2026-07-01

### Changed

- Сonsolidated duplicate utility functions (`safeNumber`, `safeBoolean`, `createCheck`, `roundScore`) into `collectors/shared.js`.
- Added `.gitattributes` to enforce LF line endings across all platforms.

### Removed

- Removed `alien/` directory — legacy detection scripts superseded by the collector architecture.

### Fixed

- `graphics.js` now imports `safeBoolean` from `shared.js` instead of redefining it locally.

## 0.1.0 - 2026-05-14

### Added

- Stable visitor identity with identity/report-only component separation.
- Browser, collector, policy, storage, and server package entry points for ESM and CommonJS.
- Script-tag browser builds with `FingerprintJSBotBlocker` global.
- Bot evidence, private-mode indicators, tamper evidence, and browser capability reporting.
- Replay protection, server-only hash mode, backend verifier, and pluggable network risk adapter.
- Stability/drift monitor and use-case presets for privacy-first, analytics, login risk, checkout risk, bot defense, and fraud defense workflows.
- Explainable report and dense ID analysis report formats.
- Browser demo, debug inspector, Node example, technical spec, audit report, and version policy.
- Full verification gate with build, typecheck, 100% Node coverage, Playwright browser tests, and bundle size check.
