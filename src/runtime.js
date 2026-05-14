import { getGlobal } from './environment.js';

export function createRuntimeContext(options, context = {}) {
  const globalRef = context.global || getGlobal();

  return Object.freeze({
    global: globalRef,
    window: context.window || globalRef.window || globalRef,
    document: context.document || globalRef.document || null,
    navigator: context.navigator || globalRef.navigator || null,
    screen: context.screen || globalRef.screen || null,
    crypto: context.crypto || globalRef.crypto || null,
    consent: context.consent || options.consent || null,
    now: typeof context.now === 'function' ? context.now : options.now
  });
}

export function createRequestId(runtime) {
  const cryptoRef = runtime.crypto;

  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function hasConsent(consent) {
  if (consent === true) {
    return true;
  }

  if (!consent || typeof consent !== 'object') {
    return false;
  }

  return consent.granted === true;
}

export function defaultNamespace() {
  const globalRef = getGlobal();
  const locationRef = globalRef.location;

  if (locationRef && locationRef.hostname) {
    return locationRef.hostname;
  }

  return 'default';
}

export function waitForRuntimeIdle(globalRef, delayMs) {
  const runtimeGlobal = globalRef || getGlobal();
  const delay = Number.isFinite(delayMs) ? Math.max(0, Number(delayMs)) : 0;

  if (runtimeGlobal && typeof runtimeGlobal.requestIdleCallback === 'function') {
    return new Promise((resolve) => {
      runtimeGlobal.requestIdleCallback(() => resolve(), { timeout: Math.max(delay * 2, 1) });
    });
  }

  const setTimer = runtimeGlobal && typeof runtimeGlobal.setTimeout === 'function'
    ? runtimeGlobal.setTimeout.bind(runtimeGlobal)
    : getGlobal().setTimeout;

  if (typeof setTimer !== 'function' || delay === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimer(resolve, delay));
}
