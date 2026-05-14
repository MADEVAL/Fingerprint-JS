import { getGlobal } from '../environment.js';
import { createCollector } from './core.js';
import { normalizeBrands, safeString } from './shared.js';

const HIGH_ENTROPY_HINTS = Object.freeze([
  'architecture',
  'bitness',
  'model',
  'platformVersion',
  'uaFullVersion',
  'fullVersionList',
  'wow64'
]);

export function createBrowserRuntimeCollector() {
  return createCollector({
    id: 'runtime.browser',
    version: '2',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 1.4,
    collect(context) {
      const navigatorRef = context.navigator;
      if (!navigatorRef) {
        return null;
      }

      const userAgentData = navigatorRef.userAgentData
        ? {
            brands: normalizeBrands(navigatorRef.userAgentData.brands),
            mobile: Boolean(navigatorRef.userAgentData.mobile),
            platform: navigatorRef.userAgentData.platform || null
          }
        : null;

      return {
        userAgent: navigatorRef.userAgent || null,
        appVersion: navigatorRef.appVersion || null,
        platform: navigatorRef.platform || null,
        vendor: navigatorRef.vendor || null,
        productSub: navigatorRef.productSub || null,
        webdriver: navigatorRef.webdriver === true,
        userAgentData
      };
    }
  });
}

export function createClientHintsCollector() {
  return createCollector({
    id: 'runtime.clientHints',
    version: '1',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.9,
    async collect(context) {
      const uaData = context.navigator && context.navigator.userAgentData;
      if (!uaData) {
        return null;
      }

      const basic = {
        brands: normalizeBrands(uaData.brands),
        mobile: Boolean(uaData.mobile),
        platform: uaData.platform || null
      };

      if (typeof uaData.getHighEntropyValues !== 'function') {
        return { basic, highEntropy: null };
      }

      try {
        const highEntropy = await uaData.getHighEntropyValues(HIGH_ENTROPY_HINTS);
        return {
          basic,
          highEntropy: normalizeHighEntropy(highEntropy)
        };
      } catch (error) {
        return {
          basic,
          highEntropy: null,
          error: error && error.message ? String(error.message) : 'client_hints_unavailable'
        };
      }
    }
  });
}

export function createNodeRuntimeCollector() {
  return createCollector({
    id: 'runtime.node',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.4,
    collect(context = {}) {
      const processRef = context.global && Object.prototype.hasOwnProperty.call(context.global, 'process')
        ? context.global.process
        : getGlobal().process;

      if (!processRef || !processRef.versions || !processRef.versions.node) {
        return null;
      }

      return {
        node: processRef.versions.node,
        platform: processRef.platform,
        arch: processRef.arch
      };
    }
  });
}

function normalizeHighEntropy(value) {
  return {
    architecture: safeString(value && value.architecture),
    bitness: safeString(value && value.bitness),
    model: safeString(value && value.model),
    platformVersion: safeString(value && value.platformVersion),
    uaFullVersion: safeString(value && value.uaFullVersion),
    fullVersionList: normalizeBrands(value && value.fullVersionList),
    wow64: typeof (value && value.wow64) === 'boolean' ? value.wow64 : null
  };
}