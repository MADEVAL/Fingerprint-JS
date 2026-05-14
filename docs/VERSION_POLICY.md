# Identifier Version Policy: FingerprintJS by BotBlocker

The public JavaScript API follows semantic versioning. The exact set of built-in fingerprint components is allowed to change in minor versions because browsers change quickly and unstable signals sometimes need to be removed, suppressed, or normalized.

The `IdentifyResult.meta.schemaVersion` and `IdentifyResult.meta.version` fields are part of the compatibility contract. The current identity schema is `bbid-v2`, which hashes identity-safe components only and keeps report-only risk signals out of the default visitor ID. Consumers that compare identifiers across SDK upgrades should compare identifiers produced by the same major and minor SDK version first. If the major or minor version differs, treat equality as useful evidence but not as a strict guarantee.

Patch releases should not intentionally change the default identity hash payload unless a browser stability fix requires it. Adding or changing report-only components does not have to change `visitorId`. When a stability fix changes an identity component value, the change should be documented in the audit report or release notes.

Backend-only verifier changes follow the public API semantic version. Replay token format changes must update the token `version`; server hash payload changes must be documented because they can change backend-only visitor IDs even when client `visitorId` remains stable.

Recommended migration flow for sensitive integrations:

1. Run the old and new SDK versions in parallel for a short observation window.
2. Store both identifiers with their SDK version and schema version.
3. Compare `meta.identityComponents` and `meta.reportOnlyComponents` to verify the expected hash inputs.
4. Promote the new version only after the product confirms acceptable stability for its target browser mix.