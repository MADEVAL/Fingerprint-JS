export const USE_CASE_PRESETS = Object.freeze({
  'privacy-first': freezePreset({
    profile: 'strict',
    policy: { requireConsent: true, redactValues: true },
    identity: { denyCollectors: ['browser.tamperEvidence', 'browser.botDetection', 'browser.privacyMode'] }
  }),
  'analytics-lite': freezePreset({
    profile: 'balanced',
    policy: { includeActive: false, includeUnstable: false },
    identity: { denyCollectors: ['network.connection', 'performance.memory'] }
  }),
  'login-risk': freezePreset({
    profile: 'extended',
    policy: { includeActive: true, includeUnstable: true },
    identity: { denyCollectors: ['browser.tamperEvidence', 'browser.botDetection', 'browser.privacyMode'] }
  }),
  'checkout-risk': freezePreset({
    profile: 'extended',
    policy: { includeActive: true, includeUnstable: true },
    identity: { denyCollectors: ['browser.applePay', 'browser.privateClickMeasurement', 'browser.domBlockers'] }
  }),
  'bot-defense': freezePreset({
    profile: 'extended',
    policy: { includeActive: true, includeUnstable: true },
    identity: { denyCollectors: ['browser.tamperEvidence', 'browser.botDetection'] }
  }),
  'fraud-defense': freezePreset({
    profile: 'extended',
    policy: { includeActive: true, includeUnstable: true },
    identity: { includeNonHashable: false }
  })
});

export function listUseCasePresets() {
  return Object.freeze(Object.keys(USE_CASE_PRESETS));
}

export function createUseCasePreset(name, overrides = {}) {
  const preset = USE_CASE_PRESETS[String(name)];
  if (!preset) {
    throw new TypeError(`Unknown use-case preset: ${name}`);
  }

  return freezePreset({
    profile: overrides.profile || preset.profile,
    policy: { ...preset.policy, ...(overrides.policy || {}) },
    identity: { ...preset.identity, ...(overrides.identity || {}) }
  });
}

function freezePreset(preset) {
  return Object.freeze({
    profile: preset.profile,
    policy: Object.freeze({ ...preset.policy }),
    identity: Object.freeze({ ...preset.identity })
  });
}