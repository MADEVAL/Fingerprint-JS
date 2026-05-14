import { normalizeError } from './errors.js';
import { getGlobal } from './environment.js';

export function createMemoryStorage(initialState) {
  const memory = initialState instanceof Map ? initialState : new Map(Object.entries(initialState || {}));

  return Object.freeze({
    type: 'memory',
    get(key) {
      return memory.get(key) || null;
    },
    set(key, value) {
      memory.set(key, value);
    }
  });
}

export function resolveStorage(storageOption, namespace) {
  if (!storageOption) {
    return null;
  }

  if (storageOption === 'local') {
    const globalRef = getGlobal();
    if (!canUseStorage(globalRef, 'localStorage')) {
      return null;
    }

    return Object.freeze({
      type: 'localStorage',
      async get(key) {
        return globalRef.localStorage.getItem(key);
      },
      async set(key, value) {
        globalRef.localStorage.setItem(key, value);
      }
    });
  }

  if (storageOption && typeof storageOption.get === 'function' && typeof storageOption.set === 'function') {
    return Object.freeze({
      type: storageOption.type || `custom:${namespace}`,
      get: storageOption.get.bind(storageOption),
      set: storageOption.set.bind(storageOption)
    });
  }

  throw new TypeError('storage must be false, "local", or an object with get/set methods.');
}

export async function updateStorageState(storage, key, visitorId, createdAt) {
  if (!storage || !visitorId) {
    return Object.freeze({ enabled: Boolean(storage), status: visitorId ? 'disabled' : 'skipped' });
  }

  try {
    const previousRaw = await storage.get(key);
    const previous = previousRaw ? JSON.parse(previousRaw) : null;
    const next = {
      visitorId,
      firstSeenAt: previous && previous.visitorId === visitorId ? previous.firstSeenAt : createdAt,
      lastSeenAt: createdAt,
      seenCount: previous && previous.visitorId === visitorId ? Number(previous.seenCount || 0) + 1 : 1
    };

    await storage.set(key, JSON.stringify(next));

    return Object.freeze({
      enabled: true,
      type: storage.type,
      status: previous && previous.visitorId === visitorId ? 'updated' : 'created',
      firstSeenAt: next.firstSeenAt,
      seenCount: next.seenCount
    });
  } catch (error) {
    return Object.freeze({
      enabled: true,
      type: storage.type,
      status: 'error',
      error: normalizeError(error)
    });
  }
}

export function canUseStorage(globalRef, key) {
  try {
    const storage = globalRef && globalRef[key];
    if (!storage || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      return false;
    }

    const testKey = '__fingerprint_framework_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch (_error) {
    return false;
  }
}
