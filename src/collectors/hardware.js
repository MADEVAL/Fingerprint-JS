import { detectBrowserQuirks, shouldSuppressSignal } from '../browser-quirks.js';
import { createCollector } from './core.js';
import { getMatchMedia, getWindowRef, safeNumber } from './shared.js';

export function createHardwareCollector() {
  return createCollector({
    id: 'hardware',
    version: '2',
    category: 'hardware',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 1,
    collect(context) {
      const navigatorRef = context.navigator;
      if (!navigatorRef) {
        return null;
      }

      const quirks = detectBrowserQuirks(context);
      return {
        hardwareConcurrency: shouldSuppressSignal('hardware.concurrency', quirks) ? null : safeNumber(navigatorRef.hardwareConcurrency),
        deviceMemory: safeNumber(navigatorRef.deviceMemory),
        maxTouchPoints: safeNumber(navigatorRef.maxTouchPoints)
      };
    }
  });
}

export function createTouchSupportCollector() {
  return createCollector({
    id: 'hardware.touch',
    version: '1',
    category: 'hardware',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.45,
    collect(context) {
      const navigatorRef = context.navigator;
      const windowRef = getWindowRef(context);
      const matchMedia = getMatchMedia(context);

      return {
        maxTouchPoints: navigatorRef ? safeNumber(navigatorRef.maxTouchPoints) : null,
        touchEvent: typeof windowRef.TouchEvent === 'function',
        coarsePointer: matchMedia ? safeMatches(matchMedia, '(pointer: coarse)') : null,
        anyCoarsePointer: matchMedia ? safeMatches(matchMedia, '(any-pointer: coarse)') : null
      };
    }
  });
}

export function createArchitectureCollector() {
  return createCollector({
    id: 'hardware.architecture',
    version: '1',
    category: 'hardware',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.5,
    collect() {
      const float = new Float32Array(1);
      const bytes = new Uint8Array(float.buffer);
      float[0] = Infinity;

      return {
        littleEndian: Boolean(1 - Math.min(1, bytes[0])),
        infinityBytePattern: Array.from(bytes).join('-')
      };
    }
  });
}

function safeMatches(matchMedia, query) {
  try {
    return Boolean(matchMedia(query).matches);
  } catch (_error) {
    return null;
  }
}