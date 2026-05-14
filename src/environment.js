export function getGlobal() {
  return globalThis;
}

export function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

export function elapsedSince(startedAt) {
  return round(Math.max(0, nowMs() - startedAt), 3);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
