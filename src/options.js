import { DEFAULT_COLLECTOR_TIMEOUT_MS, DEFAULT_LOAD_DELAY_MS, PROFILE_PRESETS } from './constants.js';
import { defaultNamespace } from './runtime.js';
import { resolveStorage } from './storage.js';

export function normalizeClientOptions(options) {
  const profile = options.profile || 'balanced';

  if (!PROFILE_PRESETS[profile]) {
    throw new TypeError(`Unknown privacy profile: ${profile}`);
  }

  const namespace = String(options.namespace || defaultNamespace());
  const storage = resolveStorage(options.storage, namespace);

  return Object.freeze({
    profile,
    namespace,
    salt: String(options.salt || ''),
    collectorTimeoutMs: Number.isFinite(options.collectorTimeoutMs)
      ? Math.max(0, Number(options.collectorTimeoutMs))
      : DEFAULT_COLLECTOR_TIMEOUT_MS,
    loadDelayMs: Number.isFinite(options.loadDelayMs) ? Math.max(0, Number(options.loadDelayMs)) : DEFAULT_LOAD_DELAY_MS,
    storage,
    storageKey: `fingerprintjs-botblocker:${namespace}:state`,
    identity: normalizeIdentityOptions(options.identity),
    consent: options.consent || null,
    now: typeof options.now === 'function' ? options.now : Date.now
  });
}

function normalizeIdentityOptions(value) {
  const identity = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    includeNonHashable: Boolean(identity.includeNonHashable),
    allowCollectors: normalizeStringArray(identity.allowCollectors),
    denyCollectors: normalizeStringArray(identity.denyCollectors)
  });
}

function normalizeStringArray(value) {
  return Object.freeze(Array.isArray(value) ? value.map(String) : []);
}
