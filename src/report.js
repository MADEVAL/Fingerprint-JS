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