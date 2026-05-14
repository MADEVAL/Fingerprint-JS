import { canonicalStringify } from './canonical.js';

export function componentsToDebugString(components) {
  if (!Array.isArray(components)) {
    throw new TypeError('components must be an array.');
  }

  return components
    .map((component) => {
      const payload = component.status === 'ok'
        ? canonicalStringify(component.value)
        : canonicalStringify(component.error);
      return `${component.id} [${component.status}] ${payload}`;
    })
    .join('\n');
}