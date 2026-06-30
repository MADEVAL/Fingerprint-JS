/* FingerprintJS by BotBlocker v0.1.1 | MIT | https://botblocker.top */

// src/constants.js
var SENSITIVITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });
var PROFILE_PRESETS = Object.freeze({
  strict: Object.freeze({
    maxSensitivity: "low",
    includeActive: false,
    includeUnstable: false
  }),
  balanced: Object.freeze({
    maxSensitivity: "medium",
    includeActive: false,
    includeUnstable: false
  }),
  extended: Object.freeze({
    maxSensitivity: "high",
    includeActive: true,
    includeUnstable: true
  })
});

// src/policy.js
function createPolicy(profile = "balanced", overrides = {}) {
  if (!PROFILE_PRESETS[profile]) {
    throw new TypeError(`Unknown privacy profile: ${profile}`);
  }
  const preset = PROFILE_PRESETS[profile];
  const maxSensitivity = overrides.maxSensitivity || preset.maxSensitivity;
  if (!SENSITIVITY_RANK[maxSensitivity]) {
    throw new TypeError(`Unknown sensitivity: ${maxSensitivity}`);
  }
  return Object.freeze({
    profile,
    requireConsent: Boolean(overrides.requireConsent),
    redactValues: Boolean(overrides.redactValues),
    maxSensitivity,
    includeActive: typeof overrides.includeActive === "boolean" ? overrides.includeActive : preset.includeActive,
    includeUnstable: typeof overrides.includeUnstable === "boolean" ? overrides.includeUnstable : preset.includeUnstable,
    allowCollectors: toFrozenSet(overrides.allowCollectors),
    denyCollectors: toFrozenSet(overrides.denyCollectors),
    allowCategories: toFrozenSet(overrides.allowCategories),
    denyCategories: toFrozenSet(overrides.denyCategories)
  });
}
function isCollectorAllowed(collector, policy) {
  if (policy.denyCollectors.has(collector.id)) {
    return false;
  }
  if (policy.allowCollectors.size > 0 && !policy.allowCollectors.has(collector.id)) {
    return false;
  }
  if (policy.denyCategories.has(collector.category)) {
    return false;
  }
  if (policy.allowCategories.size > 0 && !policy.allowCategories.has(collector.category)) {
    return false;
  }
  if (SENSITIVITY_RANK[collector.sensitivity] > SENSITIVITY_RANK[policy.maxSensitivity]) {
    return false;
  }
  if (collector.mode === "active" && !policy.includeActive) {
    return false;
  }
  if (collector.stability === "volatile" && !policy.includeUnstable) {
    return false;
  }
  return true;
}
function toFrozenSet(value) {
  if (!value) {
    return Object.freeze(/* @__PURE__ */ new Set());
  }
  if (!Array.isArray(value)) {
    throw new TypeError("Policy allow/deny lists must be arrays.");
  }
  return Object.freeze(new Set(value.map(String)));
}
export {
  createPolicy,
  isCollectorAllowed
};
