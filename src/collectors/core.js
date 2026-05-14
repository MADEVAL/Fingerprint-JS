import { SENSITIVITY_RANK } from '../constants.js';

export function createCollector(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('Collector definition must be an object.');
  }

  if (!definition.id || typeof definition.id !== 'string') {
    throw new TypeError('Collector id must be a non-empty string.');
  }

  if (typeof definition.collect !== 'function') {
    throw new TypeError(`Collector ${definition.id} must provide collect(context).`);
  }

  if (definition.prepare != null && typeof definition.prepare !== 'function') {
    throw new TypeError(`Collector ${definition.id} prepare must be a function when provided.`);
  }

  const sensitivity = definition.sensitivity || 'low';
  if (!SENSITIVITY_RANK[sensitivity]) {
    throw new TypeError(`Collector ${definition.id} has unknown sensitivity: ${sensitivity}`);
  }

  return Object.freeze({
    id: definition.id,
    version: String(definition.version || '1'),
    category: String(definition.category || 'custom'),
    sensitivity,
    mode: definition.mode === 'active' ? 'active' : 'passive',
    stability: definition.stability || 'stable',
    weight: Number.isFinite(definition.weight) ? Math.max(0, Number(definition.weight)) : 1,
    prepare: definition.prepare || null,
    collect: definition.collect
  });
}
