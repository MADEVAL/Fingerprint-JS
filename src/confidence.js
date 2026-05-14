import { SCHEMA_VERSION, SENSITIVITY_RANK } from './constants.js';
import { clamp, round } from './environment.js';
import { isCollectorAllowed } from './policy.js';

export function createHashPayload(components, namespace, salt, identityOptions = {}) {
  const values = {};

  for (const component of selectIdentityComponents(components, identityOptions)) {
    values[component.id] = {
      version: component.version,
      value: component.value
    };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    namespace,
    salt,
    values
  };
}

export function selectIdentityComponents(components, identityOptions = {}) {
  const allowCollectors = toStringSet(identityOptions.allowCollectors);
  const denyCollectors = toStringSet(identityOptions.denyCollectors);
  const includeNonHashable = Boolean(identityOptions.includeNonHashable);

  return components.filter((component) => component && component.status === 'ok'
    && (includeNonHashable || component.hashable !== false)
    && (allowCollectors.size === 0 || allowCollectors.has(component.id))
    && !denyCollectors.has(component.id));
}

export function calculateConfidence(components, collectors, policy, identityOptions = {}) {
  let possibleCollectionWeight = 0;
  let collectedCollectionWeight = 0;
  let possibleIdentityWeight = 0;
  let collectedIdentityWeight = 0;
  let identityEntropy = 0;

  const allowedCollectorIds = new Set(
    collectors.filter((collector) => isCollectorAllowed(collector, policy)).map((collector) => collector.id)
  );

  const identityCollectorIds = new Set(collectors
    .filter((collector) => allowedCollectorIds.has(collector.id) && isIdentityCollector(collector, identityOptions))
    .map((collector) => collector.id));

  for (const collector of collectors) {
    if (!allowedCollectorIds.has(collector.id)) {
      continue;
    }

    possibleCollectionWeight += collector.weight;
    if (identityCollectorIds.has(collector.id)) {
      possibleIdentityWeight += collector.weight;
    }
  }

  for (const component of components) {
    if (component.status !== 'ok') {
      continue;
    }

    collectedCollectionWeight += component.weight;
    if (identityCollectorIds.has(component.id)) {
      collectedIdentityWeight += component.weight;
      identityEntropy += component.weight * SENSITIVITY_RANK[component.sensitivity];
    }
  }

  const collectionScore = possibleCollectionWeight > 0 ? round(clamp(collectedCollectionWeight / possibleCollectionWeight, 0, 1), 3) : 0;
  const completeness = possibleIdentityWeight > 0 ? clamp(collectedIdentityWeight / possibleIdentityWeight, 0, 1) : 0;
  const platformScore = estimatePlatformScore(components);
  const score = round(completeness * platformScore, 3);

  return Object.freeze({
    score,
    level: score >= 0.75 ? 'high' : score >= 0.45 ? 'medium' : 'low',
    entropy: round(identityEntropy, 3),
    collectedWeight: round(collectedIdentityWeight, 3),
    possibleWeight: round(possibleIdentityWeight, 3),
    platformScore: round(platformScore, 3),
    collectionQuality: Object.freeze({
      score: collectionScore,
      level: collectionScore >= 0.75 ? 'high' : collectionScore >= 0.45 ? 'medium' : 'low',
      collectedWeight: round(collectedCollectionWeight, 3),
      possibleWeight: round(possibleCollectionWeight, 3)
    })
  });
}

function isIdentityCollector(collector, identityOptions) {
  const allowCollectors = toStringSet(identityOptions.allowCollectors);
  const denyCollectors = toStringSet(identityOptions.denyCollectors);
  return (identityOptions.includeNonHashable || collector.hashable !== false)
    && (allowCollectors.size === 0 || allowCollectors.has(collector.id))
    && !denyCollectors.has(collector.id);
}

function toStringSet(value) {
  return Object.freeze(new Set(Array.isArray(value) ? value.map(String) : []));
}

function estimatePlatformScore(components) {
  const runtime = components.find((component) => component.id === 'runtime.browser' && component.status === 'ok');
  const value = runtime && runtime.value && typeof runtime.value === 'object' ? runtime.value : null;
  const userAgent = String((value && value.userAgent) || '');
  const platform = String((value && value.platform) || (value && value.userAgentData && value.userAgentData.platform) || '');

  if (!value) {
    return 1;
  }

  if (/Android/u.test(userAgent) || platform === 'Android') {
    return 0.4;
  }

  if (/Safari\//u.test(userAgent) && !/Chrome\/|Chromium\/|Edg\//u.test(userAgent)) {
    return /Mac/u.test(platform) ? 0.5 : 0.3;
  }

  if (/^Win/u.test(platform)) {
    return 0.6;
  }

  if (/^Mac/u.test(platform)) {
    return 0.5;
  }

  return 0.7;
}
