import { canonicalStringify } from './canonical.js';
import { createDefaultCollectors } from './collectors/index.js';
import { collectPreparedComponents, normalizeCollectors, prepareCollectors, redactComponent } from './components.js';
import { calculateConfidence, createHashPayload, selectIdentityComponents } from './confidence.js';
import { SCHEMA_VERSION, VERSION } from './constants.js';
import { hashValue } from './crypto.js';
import { componentsToDebugString } from './debug.js';
import { elapsedSince, nowMs } from './environment.js';
import { normalizeClientOptions } from './options.js';
import { createPolicy } from './policy.js';
import { createRequestId, createRuntimeContext, hasConsent, waitForRuntimeIdle } from './runtime.js';
import { updateStorageState } from './storage.js';

export function createClient(options = {}) {
  const clientOptions = normalizeClientOptions(options);
  const collectors = normalizeCollectors(options.collectors || createDefaultCollectors());
  const policy = createPolicy(clientOptions.profile, clientOptions.policy);
  const state = { preparedAt: null, preparedValues: new Map() };

  const client = {
    version: VERSION,
    profile: clientOptions.profile,
    collectors: collectors.map((collector) => collector.id),
    get preparedAt() {
      return state.preparedAt;
    },
    async prepare(context = {}) {
      const runtime = createRuntimeContext(clientOptions, context);
      await waitForRuntimeIdle(runtime.global, clientOptions.loadDelayMs);
      if (policy.requireConsent && !hasConsent(runtime.consent)) {
        state.preparedValues = new Map();
        state.preparedAt = new Date(runtime.now()).toISOString();
        return client;
      }

      state.preparedValues = await prepareCollectors(collectors, policy, runtime, clientOptions.collectorTimeoutMs);
      state.preparedAt = new Date(runtime.now()).toISOString();
      return client;
    },
    async get(context = {}) {
      return identifyWithCollectors(collectors, policy, clientOptions, context, state.preparedValues);
    },
    async identify(context = {}) {
      return identifyWithCollectors(collectors, policy, clientOptions, context, state.preparedValues);
    },
    async components(context = {}) {
      const runtime = createRuntimeContext(clientOptions, context);
      const collected = await collectPreparedComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs, state.preparedValues);
      return collected.map((component) => redactComponent(component, policy));
    },
    async debug(context = {}) {
      const components = await client.components(context);
      return componentsToDebugString(components);
    }
  };

  return Object.freeze(client);
}

async function identifyWithCollectors(collectors, policy, clientOptions, context, preparedValues) {
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

  const components = await collectPreparedComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs, preparedValues);
  const identityComponents = selectIdentityComponents(components, clientOptions.identity);
  const payload = createHashPayload(components, clientOptions.namespace, clientOptions.salt, clientOptions.identity);
  const confidence = calculateConfidence(components, collectors, policy, clientOptions.identity);
  const okComponentCount = identityComponents.length;
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
      identityComponents: identityComponents.map((component) => component.id),
      reportOnlyComponents: components.filter((component) => component.status === 'ok' && !identityComponents.includes(component)).map((component) => component.id),
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
      possibleWeight: 0,
      platformScore: 0,
      collectionQuality: Object.freeze({
        score: 0,
        level: 'low',
        collectedWeight: 0,
        possibleWeight: 0
      })
    }),
    components: Object.freeze([]),
    meta: Object.freeze({
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      profile: details.profile,
      durationMs: details.durationMs,
      hashAlgorithm: null,
      identityComponents: Object.freeze([]),
      reportOnlyComponents: Object.freeze([]),
      blocked: true,
      reason: details.reason,
      storage: Object.freeze({ enabled: false, status: 'skipped' })
    })
  });
}
