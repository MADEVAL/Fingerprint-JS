import { canonicalStringify } from './canonical.js';
import { createHashPayload, selectIdentityComponents } from './confidence.js';
import { hashValue } from './crypto.js';
import { createRuntimeContext } from './runtime.js';

export async function hashComponents(components, options = {}, context = {}) {
  if (!Array.isArray(components)) {
    throw new TypeError('components must be an array.');
  }

  const namespace = String(options.namespace || 'default');
  const salt = String(options.salt || '');
  const validComponents = components.filter((component) => component && typeof component === 'object');
  const identityOptions = {
    includeNonHashable: Boolean(options.includeNonHashable),
    allowCollectors: options.allowCollectors,
    denyCollectors: options.denyCollectors
  };
  const identityComponents = selectIdentityComponents(validComponents, identityOptions);
  const okComponentCount = identityComponents.length;

  if (okComponentCount === 0) {
    return Object.freeze({ visitorId: null, hashAlgorithm: null, namespace });
  }

  const runtime = createRuntimeContext({ consent: null, now: Date.now }, context);
  const payload = createHashPayload(validComponents, namespace, salt, identityOptions);
  const hash = await hashValue(canonicalStringify(payload), runtime);

  return Object.freeze({ visitorId: hash.value, hashAlgorithm: hash.algorithm, namespace });
}