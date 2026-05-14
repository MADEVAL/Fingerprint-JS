import { canonicalStringify } from './canonical.js';

export function createStabilityMonitor(options = {}) {
  const historyLimit = Number.isFinite(options.historyLimit) ? Math.max(1, Number(options.historyLimit)) : 10;
  let baselineVisitorId = null;
  let previousComponents = null;
  let history = [];

  return Object.freeze({
    observe(result) {
      assertResult(result);
      if (!baselineVisitorId) {
        baselineVisitorId = result.visitorId;
      }

      const drift = diffComponents(previousComponents || [], result.components, result.meta && result.meta.identityComponents);
      const entry = Object.freeze({
        index: history.length + 1,
        visitorId: result.visitorId,
        matchesBaseline: result.visitorId === baselineVisitorId,
        createdAt: result.createdAt,
        identityChanged: drift.identityChanged,
        reportOnlyChanged: drift.reportOnlyChanged
      });

      history = Object.freeze([entry, ...history].slice(0, historyLimit));
      previousComponents = result.components;

      return Object.freeze({
        baselineVisitorId,
        currentVisitorId: result.visitorId,
        matchesBaseline: result.visitorId === baselineVisitorId,
        runCount: history.length,
        drift,
        history
      });
    },
    reset() {
      baselineVisitorId = null;
      previousComponents = null;
      history = [];
    },
    snapshot() {
      return Object.freeze({ baselineVisitorId, history });
    }
  });
}

export function diffComponents(previousComponents = [], currentComponents = [], identityComponentIds = []) {
  const previousById = new Map(previousComponents.map((component) => [component.id, component]));
  const currentById = new Map(currentComponents.map((component) => [component.id, component]));
  const identityIds = new Set(Array.isArray(identityComponentIds) ? identityComponentIds : []);
  const identityChanged = [];
  const reportOnlyChanged = [];
  const added = [];
  const removed = [];

  for (const component of currentComponents) {
    const previous = previousById.get(component.id);
    if (!previous) {
      added.push(component.id);
    }

    if (!previous || componentSignature(previous) !== componentSignature(component)) {
      (identityIds.has(component.id) ? identityChanged : reportOnlyChanged).push(component.id);
    }
  }

  for (const component of previousComponents) {
    if (!currentById.has(component.id)) {
      removed.push(component.id);
      (identityIds.has(component.id) ? identityChanged : reportOnlyChanged).push(component.id);
    }
  }

  return Object.freeze({
    identityChanged: Object.freeze(unique(identityChanged)),
    reportOnlyChanged: Object.freeze(unique(reportOnlyChanged)),
    added: Object.freeze(added),
    removed: Object.freeze(removed)
  });
}

function assertResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.components)) {
    throw new TypeError('Stability monitor requires an IdentifyResult-like object.');
  }
}

function componentSignature(component) {
  return canonicalStringify({ status: component.status, version: component.version, value: component.value, error: component.error });
}

function unique(values) {
  return Array.from(new Set(values));
}