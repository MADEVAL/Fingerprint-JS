import { canUseStorage } from '../storage.js';
import { createCollector } from './core.js';

export function createStorageCapabilitiesCollector() {
  return createCollector({
    id: 'storage.capabilities',
    version: '2',
    category: 'storage',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.65,
    hashable: false,
    collect(context) {
      const navigatorRef = context.navigator;
      const globalRef = context.global;

      return {
        cookieEnabled: navigatorRef ? Boolean(navigatorRef.cookieEnabled) : null,
        doNotTrack: navigatorRef ? navigatorRef.doNotTrack || null : null,
        indexedDB: hasFeature(globalRef, 'indexedDB'),
        localStorage: canUseStorage(globalRef, 'localStorage'),
        openDatabase: typeof globalRef.openDatabase === 'function',
        sessionStorage: canUseStorage(globalRef, 'sessionStorage')
      };
    }
  });
}

function hasFeature(globalRef, key) {
  try {
    return Boolean(globalRef[key]);
  } catch (_error) {
    return true;
  }
}