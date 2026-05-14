# Contributing

## Local Setup

```bash
npm ci
npm run verify
```

`npm run verify` is the required quality gate before a change is submitted. It builds all package entry points, validates declarations, runs Node tests with 100% coverage, runs Playwright browser tests, and checks the browser bundle size budget.

## Development Rules

- Keep browser runtime code dependency-free.
- Keep server-only verification code out of the browser entry point.
- Do not add volatile or risk-only signals to the default visitor ID hash unless the version policy is updated.
- Prefer adding report-only evidence over changing identity inputs.
- Update TypeScript declarations, docs, tests, and generated `dist/` artifacts when public APIs change.
- Keep examples in English and runnable from a local checkout.

## Release Readiness

Before publishing, run:

```bash
npm run verify
npm pack --dry-run
npm publish --dry-run
```

Review the dry-run file list and confirm that no local-only files are included in the package.
