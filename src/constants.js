export const VERSION = '0.2.0';
export const SCHEMA_VERSION = 'bbid-v2';
export const DEFAULT_COLLECTOR_TIMEOUT_MS = 700;
export const DEFAULT_LOAD_DELAY_MS = 50;

export const SENSITIVITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });

export const PROFILE_PRESETS = Object.freeze({
  strict: Object.freeze({
    maxSensitivity: 'low',
    includeActive: false,
    includeUnstable: false
  }),
  balanced: Object.freeze({
    maxSensitivity: 'medium',
    includeActive: false,
    includeUnstable: false
  }),
  extended: Object.freeze({
    maxSensitivity: 'high',
    includeActive: true,
    includeUnstable: true
  })
});
