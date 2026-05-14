# Identifier Version Policy

The public JavaScript API follows semantic versioning. The exact set of built-in fingerprint components is allowed to change in minor versions because browsers change quickly and unstable signals sometimes need to be removed, suppressed, or normalized.

The `IdentifyResult.meta.schemaVersion` and `IdentifyResult.meta.version` fields are part of the compatibility contract. Consumers that compare identifiers across SDK upgrades should compare identifiers produced by the same major and minor SDK version first. If the major or minor version differs, treat equality as useful evidence but not as a strict guarantee.

Patch releases should not intentionally change the hash payload unless a browser stability fix requires it. When a stability fix changes a component value, the change should be documented in the audit report or release notes.

Recommended migration flow for sensitive integrations:

1. Run the old and new SDK versions in parallel for a short observation window.
2. Store both identifiers with their SDK version and schema version.
3. Promote the new version only after the product confirms acceptable stability for its target browser mix.