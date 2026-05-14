import { createCollector } from './core.js';
import { getWindowRef, safeNumber } from './shared.js';

export function createTamperEvidenceCollector() {
  return createCollector({
    id: 'browser.tamperEvidence',
    version: '1',
    category: 'risk',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'volatile',
    weight: 0.9,
    hashable: false,
    collect(context) {
      return evaluateTamperEvidence(context);
    }
  });
}

export function evaluateTamperEvidence(context = {}) {
  const windowRef = getWindowRef(context);
  const navigatorRef = context.navigator || windowRef.navigator || null;
  const documentRef = context.document || windowRef.document || null;
  const screenRef = context.screen || windowRef.screen || null;
  const evidence = [];

  if (!isNativeFunction(Function.prototype.toString)) {
    addEvidence(evidence, 'function_to_string_patched', 'high', 'Function.prototype.toString does not look native.');
  }

  if (navigatorRef && navigatorRef.webdriver === true) {
    addEvidence(evidence, 'webdriver_enabled', 'high', 'navigator.webdriver is true.');
  }

  const permissionsQuery = navigatorRef && navigatorRef.permissions && navigatorRef.permissions.query;
  if (permissionsQuery && !isNativeFunction(permissionsQuery)) {
    addEvidence(evidence, 'permissions_query_patched', 'medium', 'navigator.permissions.query does not look native.');
  }

  const userAgent = String((navigatorRef && navigatorRef.userAgent) || '');
  const platform = String((navigatorRef && navigatorRef.platform) || '');
  const uaPlatform = String((navigatorRef && navigatorRef.userAgentData && navigatorRef.userAgentData.platform) || '');
  if (uaPlatform && platform && uaPlatform !== platform && !isCompatiblePlatform(platform, uaPlatform)) {
    addEvidence(evidence, 'platform_mismatch', 'medium', 'navigator.platform and userAgentData.platform disagree.', { platform, userAgentDataPlatform: uaPlatform });
  }

  if (/Android/u.test(userAgent) && uaPlatform && uaPlatform !== 'Android') {
    addEvidence(evidence, 'android_client_hint_mismatch', 'medium', 'Android user agent disagrees with client hints platform.', { userAgentDataPlatform: uaPlatform });
  }

  if (navigatorRef && Array.isArray(navigatorRef.languages) && navigatorRef.language && !navigatorRef.languages.includes(navigatorRef.language)) {
    addEvidence(evidence, 'language_mismatch', 'low', 'navigator.language is absent from navigator.languages.');
  }

  const pluginLength = safeNumber(navigatorRef && navigatorRef.plugins && navigatorRef.plugins.length);
  if (/Chrome\/|Chromium\/|Edg\//u.test(userAgent) && pluginLength === 0) {
    addEvidence(evidence, 'chromium_empty_plugins', 'low', 'Chromium-like browser reports an empty plugin list.');
  }

  const screenWidth = safeNumber(screenRef && screenRef.width);
  const screenHeight = safeNumber(screenRef && screenRef.height);
  if (screenWidth === 0 || screenHeight === 0) {
    addEvidence(evidence, 'zero_screen', 'medium', 'Screen dimensions contain zero values.');
  }

  const canvasToDataUrl = getCanvasToDataUrl(documentRef);
  if (canvasToDataUrl && !isNativeFunction(canvasToDataUrl)) {
    addEvidence(evidence, 'canvas_to_data_url_patched', 'medium', 'Canvas toDataURL does not look native.');
  }

  const score = calculateTamperScore(evidence);
  return Object.freeze({
    verdict: score >= 0.7 ? 'tampered' : score >= 0.3 ? 'suspicious' : 'clean',
    score,
    confidence: evidence.some((item) => item.severity === 'high') ? 'high' : evidence.length > 0 ? 'medium' : 'low',
    evidence: Object.freeze(evidence)
  });
}

function addEvidence(evidence, code, severity, message, detail = null) {
  evidence.push(Object.freeze({ code, severity, message, detail }));
}

function calculateTamperScore(evidence) {
  const total = evidence.reduce((score, item) => score + severityWeight(item.severity), 0);
  return Math.min(1, Math.round(total * 1000) / 1000);
}

function severityWeight(severity) {
  return severity === 'high' ? 0.45 : severity === 'medium' ? 0.25 : 0.1;
}

function isNativeFunction(value) {
  if (typeof value !== 'function') {
    return false;
  }

  try {
    return /\[native code\]/u.test(Function.prototype.toString.call(value));
  } catch (_error) {
    return false;
  }
}

function isCompatiblePlatform(platform, uaPlatform) {
  return (platform.startsWith('Win') && uaPlatform === 'Windows')
    || (platform.startsWith('Mac') && uaPlatform === 'macOS')
    || (platform.startsWith('Linux') && uaPlatform === 'Linux');
}

function getCanvasToDataUrl(documentRef) {
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    return null;
  }

  try {
    const canvas = documentRef.createElement('canvas');
    return canvas && canvas.toDataURL ? canvas.toDataURL : null;
  } catch (_error) {
    return null;
  }
}