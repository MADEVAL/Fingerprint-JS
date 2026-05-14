import { canonicalStringify } from './canonical.js';
import { createDefaultCollectors } from './collectors/index.js';
import { collectComponents, normalizeCollectors, redactComponent } from './components.js';
import { calculateConfidence, createHashPayload } from './confidence.js';
import { SCHEMA_VERSION, VERSION } from './constants.js';
import { hashValue } from './crypto.js';
import { elapsedSince, nowMs } from './environment.js';
import { normalizeClientOptions } from './options.js';
import { createPolicy } from './policy.js';
import { createRequestId, createRuntimeContext, hasConsent } from './runtime.js';
import { updateStorageState } from './storage.js';

export function createClient(options = {}) {
  const clientOptions = normalizeClientOptions(options);
  const collectors = normalizeCollectors(options.collectors || createDefaultCollectors());
  const policy = createPolicy(clientOptions.profile, options.policy || {});

  return Object.freeze({
    version: VERSION,
    profile: clientOptions.profile,
    collectors: collectors.map((collector) => collector.id),
    async identify(context = {}) {
      return identifyWithCollectors(collectors, policy, clientOptions, context);
    },
    async components(context = {}) {
      const runtime = createRuntimeContext(clientOptions, context);
      const collected = await collectComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs);
      return collected.map((component) => redactComponent(component, policy));
    }
  });
}

async function identifyWithCollectors(collectors, policy, clientOptions, context) {
  const startedAt = nowMs();
  const runtime = createRuntimeContext(clientOptions, context);
  const requestId = createRequestId(runtime);
  const createdAt = new Date(runtime.now()).toISOString();

  if (policy.requireConsent && !hasConsent(runtime.consent)) {
    return createBlockedResult({
      requestId,
      createdAt,
      namespace: clientOptions.namespace,
      profile: clientOptions.profile,
      reason: 'consent_required',
      durationMs: elapsedSince(startedAt)
    });
  }

  const components = await collectComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs);
  const payload = createHashPayload(components, clientOptions.namespace, clientOptions.salt);
  const confidence = calculateConfidence(components, collectors, policy);
  const okComponentCount = components.filter((component) => component.status === 'ok').length;
  const hash = okComponentCount > 0 ? await hashValue(canonicalStringify(payload), runtime) : null;
  const visitorId = hash ? hash.value : null;
  const storage = await updateStorageState(clientOptions.storage, clientOptions.storageKey, visitorId, createdAt);

  return Object.freeze({
    visitorId,
    requestId,
    namespace: clientOptions.namespace,
    createdAt,
    confidence,
    components: components.map((component) => redactComponent(component, policy)),
    meta: Object.freeze({
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      profile: clientOptions.profile,
      durationMs: elapsedSince(startedAt),
      hashAlgorithm: hash ? hash.algorithm : null,
      blocked: false,
      reason: null,
      storage
    })
  });
}

function createBlockedResult(details) {
  return Object.freeze({
    visitorId: null,
    requestId: details.requestId,
    namespace: details.namespace,
    createdAt: details.createdAt,
    confidence: Object.freeze({
      score: 0,
      level: 'low',
      entropy: 0,
      collectedWeight: 0,
      possibleWeight: 0
    }),
    components: Object.freeze([]),
    meta: Object.freeze({
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      profile: details.profile,
      durationMs: details.durationMs,
      hashAlgorithm: null,
      blocked: true,
      reason: details.reason,
      storage: Object.freeze({ enabled: false, status: 'skipped' })
    })
  });
}
