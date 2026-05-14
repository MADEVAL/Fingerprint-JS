# Security Policy

## Supported Versions

Security fixes are provided for the latest published minor version of `@botblocker/fingerprintjs`.

## Reporting A Vulnerability

Do not open a public issue for a suspected vulnerability. Report security concerns through the private contact channel published at https://botblocker.top.

Please include:

- affected package version;
- affected runtime or browser;
- minimal reproduction steps;
- expected and observed behavior;
- whether the issue affects client identity, replay protection, server verification, or report integrity.

## Security Notes

FingerprintJS by BotBlocker is a client signal and backend verification SDK. Browser-collected signals are evidence, not proof. Production enforcement should combine client results with backend replay checks, server hash mode, rate limits, account state, and network intelligence.

Replay protection and server hash mode require a private server secret. Do not expose that secret to browser code, client bundles, logs, or analytics events.
