import { toCanonical } from './canonical.js';
import { createCollector } from './collectors/core.js';
import { elapsedSince, getGlobal, nowMs } from './environment.js';
import { normalizeError } from './errors.js';
import { isCollectorAllowed } from './policy.js';

export function normalizeCollectors(collectors) {
  if (!Array.isArray(collectors)) {
    throw new TypeError('collectors must be an array.');
  }

  const seen = new Set();
  return collectors.map((collector) => {
    const normalized = collector && typeof collector.collect === 'function' && collector.id
      ? createCollector(collector)
      : createCollector(collector);

    if (seen.has(normalized.id)) {
      throw new TypeError(`Duplicate collector id: ${normalized.id}`);
    }

    seen.add(normalized.id);
    return normalized;
  });
}

export async function collectComponents(collectors, policy, runtime, timeoutMs) {
  return collectPreparedComponents(collectors, policy, runtime, timeoutMs, null);
}

export async function prepareCollectors(collectors, policy, runtime, timeoutMs) {
  const allowed = collectors.filter((collector) => collector.prepare && isCollectorAllowed(collector, policy));
  const preparedValues = new Map();
  const passiveCollectors = allowed.filter((collector) => collector.mode !== 'active');
  const activeCollectors = allowed.filter((collector) => collector.mode === 'active');

  const passiveValues = await Promise.all(passiveCollectors.map((collector) => prepareOneCollector(collector, runtime, timeoutMs)));
  for (let index = 0; index < passiveCollectors.length; index += 1) {
    if (passiveValues[index].ok) {
      preparedValues.set(passiveCollectors[index].id, passiveValues[index].value);
    }
  }

  for (const collector of activeCollectors) {
    const prepared = await prepareOneCollector(collector, runtime, timeoutMs);
    if (prepared.ok) {
      preparedValues.set(collector.id, prepared.value);
    }
  }

  return preparedValues;
}

export async function collectPreparedComponents(collectors, policy, runtime, timeoutMs, preparedValues) {
  const skipped = [];
  const allowed = [];

  for (const collector of collectors) {
    if (!isCollectorAllowed(collector, policy)) {
      skipped.push(createSkippedComponent(collector, 'policy_denied'));
    } else {
      allowed.push(collector);
    }
  }

  const passiveCollectors = allowed.filter((collector) => collector.mode !== 'active');
  const activeCollectors = allowed.filter((collector) => collector.mode === 'active');
  const passiveComponents = await Promise.all(
    passiveCollectors.map((collector) => collectOneComponent(collector, runtime, timeoutMs, preparedValues))
  );

  const activeComponents = [];
  for (const collector of activeCollectors) {
    activeComponents.push(await collectOneComponent(collector, runtime, timeoutMs, preparedValues));
  }

  const components = skipped.concat(passiveComponents, activeComponents);
  return components.sort((left, right) => left.id.localeCompare(right.id));
}

export function redactComponent(component, policy) {
  if (!policy.redactValues || component.status !== 'ok') {
    return component;
  }

  return Object.freeze({
    ...component,
    value: '[redacted]'
  });
}

async function collectOneComponent(collector, runtime, timeoutMs, preparedValues) {
  const startedAt = nowMs();

  try {
    const hasPrepared = preparedValues instanceof Map && preparedValues.has(collector.id);
    const prepared = hasPrepared ? preparedValues.get(collector.id) : undefined;
    const value = await withTimeout(Promise.resolve().then(() => collector.collect(runtime, prepared)), timeoutMs, collector.id);
    const canonicalValue = toCanonical(value);
    const status = canonicalValue === null ? 'empty' : 'ok';

    return freezeComponent({
      id: collector.id,
      version: collector.version,
      category: collector.category,
      sensitivity: collector.sensitivity,
      mode: collector.mode,
      stability: collector.stability,
      weight: collector.weight,
      status,
      value: canonicalValue,
      durationMs: elapsedSince(startedAt),
      error: null
    });
  } catch (error) {
    return freezeComponent({
      id: collector.id,
      version: collector.version,
      category: collector.category,
      sensitivity: collector.sensitivity,
      mode: collector.mode,
      stability: collector.stability,
      weight: collector.weight,
      status: error && error.code === 'collector_timeout' ? 'timeout' : 'error',
      value: null,
      durationMs: elapsedSince(startedAt),
      error: normalizeError(error)
    });
  }
}

async function prepareOneCollector(collector, runtime, timeoutMs) {
  try {
    const value = await withTimeout(Promise.resolve().then(() => collector.prepare(runtime)), timeoutMs, `${collector.id}:prepare`);
    return Object.freeze({ ok: true, value });
  } catch (_error) {
    return Object.freeze({ ok: false, value: undefined });
  }
}

function createSkippedComponent(collector, reason) {
  return freezeComponent({
    id: collector.id,
    version: collector.version,
    category: collector.category,
    sensitivity: collector.sensitivity,
    mode: collector.mode,
    stability: collector.stability,
    weight: collector.weight,
    status: 'skipped',
    value: null,
    durationMs: 0,
    error: Object.freeze({ code: reason, message: reason })
  });
}

function freezeComponent(component) {
  return Object.freeze({
    id: component.id,
    version: component.version,
    category: component.category,
    sensitivity: component.sensitivity,
    mode: component.mode,
    stability: component.stability,
    weight: component.weight,
    status: component.status,
    value: component.value,
    durationMs: component.durationMs,
    error: component.error
  });
}

function withTimeout(promise, timeoutMs, collectorId) {
  const globalRef = getGlobal();
  const setTimer = globalRef.setTimeout;
  const clearTimer = globalRef.clearTimeout;

  if (!timeoutMs || typeof setTimer !== 'function' || typeof clearTimer !== 'function') {
    return promise;
  }

  let timeoutId;
  const timeout = new Promise((_resolve, reject) => {
    timeoutId = setTimer(() => {
      const error = new Error(`Collector timed out: ${collectorId}`);
      error.code = 'collector_timeout';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimer(timeoutId));
}
