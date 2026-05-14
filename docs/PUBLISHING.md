# Publishing Checklist

Use this checklist for npm publication and public distribution.

## One-Time Setup

1. Confirm package ownership for the `@botblocker` npm scope.
2. Confirm the public repository URL and add it to `package.json` when available.
3. Configure npm 2FA for publish operations.
4. Prefer publishing from CI with npm provenance enabled when the release workflow is ready.
5. Confirm the security contact channel at https://botblocker.top.

## Pre-Release Checks

```bash
npm ci
npm run verify
npm audit --omit=dev
npm pack --dry-run
npm publish --dry-run
```

Expected quality gate:

- build succeeds;
- TypeScript declarations compile;
- Node coverage is 100% for lines, branches, and functions;
- Playwright tests pass in Chromium, Firefox, and WebKit;
- minified browser bundle stays under the configured budget;
- production dependency audit reports zero vulnerabilities;
- package dry-run includes only intended files.

## Versioning

- Patch release: compatible API and no intentional default identity hash change.
- Minor release: new API, new report-only signals, or documented identity hash changes.
- Major release: breaking API, package export changes, or incompatible result schema changes.

If default identity inputs change, document the migration impact in `CHANGELOG.md` and `docs/VERSION_POLICY.md`.

## Publish

```bash
npm version patch
npm publish --access public
```

Use `minor` or `major` instead of `patch` when the versioning rules require it.

## Post-Release

1. Install the package in a clean temporary project.
2. Test ESM import, CommonJS require, and the `@botblocker/fingerprintjs/server` subpath.
3. Download the browser bundle from the published package and run the browser demo.
4. Tag the release in git and attach a short release note based on `CHANGELOG.md`.
