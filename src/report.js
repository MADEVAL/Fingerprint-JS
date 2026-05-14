export function createExplainableReport(result, options = {}) {
  assertResult(result);
  const identityComponents = new Set(result.meta && Array.isArray(result.meta.identityComponents) ? result.meta.identityComponents : []);
  const components = Object.freeze(result.components.map((component) => explainComponent(component, identityComponents, options)));
  const risk = buildRiskSummary(result.components);

  return Object.freeze({
    product: 'FingerprintJS by BotBlocker',
    generatedAt: options.generatedAt || new Date().toISOString(),
    identity: Object.freeze({
      visitorId: result.visitorId || null,
      namespace: result.namespace || 'default',
      confidence: result.confidence,
      identityComponents: Object.freeze(Array.from(identityComponents)),
      reportOnlyComponents: Object.freeze(result.meta && Array.isArray(result.meta.reportOnlyComponents) ? result.meta.reportOnlyComponents.slice() : [])
    }),
    risk,
    summary: Object.freeze({
      total: result.components.length,
      ok: countStatus(result.components, 'ok'),
      reportOnly: components.filter((component) => component.role === 'report-only').length,
      identity: components.filter((component) => component.role === 'identity').length,
      tamperVerdict: risk.tamper.verdict,
      botVerdict: risk.bot.verdict,
      privateModeVerdict: risk.privateMode.verdict
    }),
    components
  });
}

export function createAnalysisReport(result, options = {}) {
  assertResult(result);
  const identityComponents = new Set(result.meta && Array.isArray(result.meta.identityComponents) ? result.meta.identityComponents : []);
  const components = Object.freeze(result.components.map((component) => analysisComponent(component, identityComponents)));
  const risk = buildRiskSummary(result.components);

  return Object.freeze({
    id: result.visitorId || null,
    requestId: result.requestId || null,
    namespace: result.namespace || 'default',
    profile: result.meta && result.meta.profile ? result.meta.profile : null,
    confidence: result.confidence || null,
    weights: summarizeWeights(result.components, result.confidence || {}, identityComponents),
    totals: Object.freeze({
      total: components.length,
      ok: countStatus(result.components, 'ok'),
      identity: components.filter((component) => component.role === 'identity').length,
      reportOnly: components.filter((component) => component.role === 'report-only').length
    }),
    hash: buildHashSummary(result, options),
    risk,
    components
  });
}

export function explainComponent(component, identityComponents = [], options = {}) {
  const identitySet = identityComponents instanceof Set ? identityComponents : new Set(identityComponents);
  const role = identitySet.has(component.id) ? 'identity' : 'report-only';
  const value = options.includeValues ? component.value : summarizeValue(component.value);

  return Object.freeze({
    id: component.id,
    role,
    reason: explainReason(component, role),
    status: component.status,
    category: component.category,
    sensitivity: component.sensitivity,
    stability: component.stability,
    hashable: component.hashable,
    durationMs: component.durationMs,
    value,
    error: component.error
  });
}

function assertResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.components)) {
    throw new TypeError('Explainable report requires an IdentifyResult-like object.');
  }
}

function explainReason(component, role) {
  if (component.status !== 'ok') {
    return `not_used_status_${component.status}`;
  }

  if (role === 'identity') {
    return 'stable_identity_input';
  }

  return component.hashable === false ? 'report_only_collector' : 'excluded_by_identity_policy';
}

function analysisComponent(component, identityComponents) {
  return Object.freeze({
    id: component.id,
    role: identityComponents.has(component.id) ? 'identity' : 'report-only',
    status: component.status,
    weight: component.weight,
    category: component.category,
    sensitivity: component.sensitivity,
    mode: component.mode,
    stability: component.stability,
    hashable: component.hashable,
    durationMs: component.durationMs,
    result: component.status === 'ok' ? component.value : null,
    error: component.error || null
  });
}

function summarizeWeights(components, confidence, identityComponents) {
  const okComponents = components.filter((component) => component.status === 'ok');
  const identityOkComponents = okComponents.filter((component) => identityComponents.has(component.id));
  const reportOnlyOkComponents = okComponents.filter((component) => !identityComponents.has(component.id));

  return Object.freeze({
    total: round(sumWeights(components)),
    ok: round(sumWeights(okComponents)),
    identity: round(sumWeights(identityOkComponents)),
    reportOnly: round(sumWeights(reportOnlyOkComponents)),
    collected: Number.isFinite(confidence.collectedWeight) ? confidence.collectedWeight : null,
    possible: Number.isFinite(confidence.possibleWeight) ? confidence.possibleWeight : null,
    qualityCollected: confidence.collectionQuality && Number.isFinite(confidence.collectionQuality.collectedWeight) ? confidence.collectionQuality.collectedWeight : null,
    qualityPossible: confidence.collectionQuality && Number.isFinite(confidence.collectionQuality.possibleWeight) ? confidence.collectionQuality.possibleWeight : null
  });
}

function buildHashSummary(result, options) {
  const recalculated = options.recalculatedHash || null;
  const allSignals = options.allSignalsHash || null;

  return Object.freeze({
    algorithm: result.meta && result.meta.hashAlgorithm ? result.meta.hashAlgorithm : null,
    recalculatedVisitorId: recalculated ? recalculated.visitorId : null,
    recalculatedMatches: recalculated ? recalculated.visitorId === result.visitorId : null,
    allSignalsVisitorId: allSignals ? allSignals.visitorId : null,
    allSignalsDiffers: allSignals ? allSignals.visitorId !== result.visitorId : null
  });
}

function sumWeights(components) {
  return components.reduce((total, component) => total + (Number.isFinite(component.weight) ? Number(component.weight) : 0), 0);
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function summarizeValue(value) {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return Object.freeze({ type: 'array', length: value.length });
  }

  if (typeof value === 'object') {
    return Object.freeze({ type: 'object', keys: Object.freeze(Object.keys(value).sort()) });
  }

  return Object.freeze({ type: typeof value, value });
}

function buildRiskSummary(components) {
  return Object.freeze({
    bot: pickRisk(components, 'browser.botDetection'),
    privateMode: pickRisk(components, 'browser.privacyMode'),
    tamper: pickRisk(components, 'browser.tamperEvidence')
  });
}

function pickRisk(components, id) {
  const component = components.find((item) => item.id === id && item.status === 'ok');
  const value = component && component.value && typeof component.value === 'object' ? component.value : null;
  return Object.freeze({
    verdict: value && value.verdict ? value.verdict : 'unavailable',
    score: value && Number.isFinite(value.score) ? value.score : null,
    confidence: value && value.confidence ? value.confidence : 'none',
    evidence: Object.freeze(value && Array.isArray(value.evidence) ? value.evidence : [])
  });
}

function countStatus(components, status) {
  return components.filter((component) => component.status === status).length;
}