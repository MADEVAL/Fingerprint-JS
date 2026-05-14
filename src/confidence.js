import { SCHEMA_VERSION, SENSITIVITY_RANK } from './constants.js';
import { clamp, round } from './environment.js';
import { isCollectorAllowed } from './policy.js';

export function createHashPayload(components, namespace, salt) {
  const values = {};

  for (const component of components) {
    if (component.status === 'ok') {
      values[component.id] = {
        version: component.version,
        value: component.value
      };
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    namespace,
    salt,
    values
  };
}

export function calculateConfidence(components, collectors, policy) {
  let possibleWeight = 0;
  let collectedWeight = 0;
  let entropy = 0;

  const allowedCollectorIds = new Set(
    collectors.filter((collector) => isCollectorAllowed(collector, policy)).map((collector) => collector.id)
  );

  for (const collector of collectors) {
    if (allowedCollectorIds.has(collector.id)) {
      possibleWeight += collector.weight;
    }
  }

  for (const component of components) {
    if (component.status !== 'ok') {
      continue;
    }

    collectedWeight += component.weight;
    entropy += component.weight * SENSITIVITY_RANK[component.sensitivity];
  }

  const score = possibleWeight > 0 ? round(clamp(collectedWeight / possibleWeight, 0, 1), 3) : 0;

  return Object.freeze({
    score,
    level: score >= 0.75 ? 'high' : score >= 0.45 ? 'medium' : 'low',
    entropy: round(entropy, 3),
    collectedWeight: round(collectedWeight, 3),
    possibleWeight: round(possibleWeight, 3)
  });
}
