import { createCollector } from './core.js';
import { getWindowRef, safeBoolean, safeNumber, safeString, toArrayLike } from './shared.js';

const API_FEATURE_GROUPS = Object.freeze({
  javascript: Object.freeze(['Promise', 'Symbol', 'Proxy', 'Reflect', 'Map', 'Set', 'WeakMap', 'WeakSet', 'BigInt', 'Atomics', 'SharedArrayBuffer', 'ArrayBuffer', 'WebAssembly']),
  browser: Object.freeze(['fetch', 'WebSocket', 'Worker', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'requestIdleCallback', 'speechSynthesis', 'performance', 'Notification']),
  storage: Object.freeze(['localStorage', 'sessionStorage', 'indexedDB', 'crypto']),
  navigator: Object.freeze(['bluetooth', 'clipboard', 'credentials', 'geolocation', 'mediaDevices', 'serviceWorker', 'permissions'])
});

const CSS_FEATURES = Object.freeze([
  ['webkitAppearance', '-webkit-appearance', 'none'],
  ['mozAppearance', '-moz-appearance', 'none'],
  ['accentColor', 'accent-color', 'auto'],
  ['containerQueries', 'container-type', 'inline-size'],
  ['oklchColor', 'color', 'oklch(0.5 0.2 240)'],
  ['viewTransitions', 'view-transition-name', 'root'],
  ['anchorPositioning', 'anchor-name', '--a']
]);

export function createApiFeaturesCollector() {
  return createCollector({
    id: 'browser.apiFeatures',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.5,
    hashable: false,
    collect(context) {
      const windowRef = getWindowRef(context);
      const navigatorRef = context.navigator || {};

      return {
        javascript: collectFeatureGroup(windowRef, API_FEATURE_GROUPS.javascript),
        browser: collectFeatureGroup(windowRef, API_FEATURE_GROUPS.browser),
        storage: collectFeatureGroup(windowRef, API_FEATURE_GROUPS.storage),
        navigator: collectFeatureGroup(navigatorRef, API_FEATURE_GROUPS.navigator)
      };
    }
  });
}

export function createCssFeaturesCollector() {
  return createCollector({
    id: 'browser.cssFeatures',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.35,
    hashable: false,
    collect(context) {
      const windowRef = getWindowRef(context);
      const cssRef = windowRef.CSS;
      if (!cssRef || typeof cssRef.supports !== 'function') {
        return null;
      }

      return Object.fromEntries(CSS_FEATURES.map(([key, property, value]) => [key, supportsCss(cssRef, property, value)]));
    }
  });
}

export function createNetworkConnectionCollector() {
  return createCollector({
    id: 'network.connection',
    version: '1',
    category: 'network',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'volatile',
    weight: 0.25,
    hashable: false,
    collect(context) {
      const navigatorRef = context.navigator || {};
      const connection = navigatorRef.connection || navigatorRef.mozConnection || navigatorRef.webkitConnection;
      if (!connection) {
        return null;
      }

      return {
        effectiveType: safeString(connection.effectiveType),
        type: safeString(connection.type),
        downlink: safeNumber(connection.downlink),
        rtt: safeNumber(connection.rtt),
        saveData: safeBoolean(connection.saveData)
      };
    }
  });
}

export function createPerformanceMemoryCollector() {
  return createCollector({
    id: 'performance.memory',
    version: '1',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'volatile',
    weight: 0.25,
    hashable: false,
    collect(context) {
      const windowRef = getWindowRef(context);
      const memory = windowRef.performance && windowRef.performance.memory;
      if (!memory) {
        return null;
      }

      return {
        jsHeapSizeLimitMB: toMegabytes(memory.jsHeapSizeLimit),
        totalJSHeapSizeMB: toMegabytes(memory.totalJSHeapSize),
        usedJSHeapSizeMB: toMegabytes(memory.usedJSHeapSize)
      };
    }
  });
}

const VENDOR_GLOBALS = Object.freeze([
  ['chrome', 'chrome'],
  ['safari', 'safari'],
  ['firefoxIos', '__firefox__'],
  ['chromeIos', '__crWeb'],
  ['edgeIos', '__edgeTrackingPreventionStatistics'],
  ['yandex', 'yandex'],
  ['opera', 'opr']
]);

const DOM_BLOCKER_BAITS = Object.freeze([
  ['generic-ad', 'ad adsbox advertisement banner_ad pub_300x250 text-ad textAd'],
  ['ad-server', 'adserver ad-banner ad-unit ad-zone ad-placement'],
  ['doubleclick', 'doubleclick dart-ad'],
  ['google-ads', 'google-ad googleads adsbygoogle'],
  ['sponsor', 'sponsor sponsored-link sponsored_content'],
  ['analytics', 'tracking analytics pixel'],
  ['social', 'social-share social-widget facebook-like twitter-share'],
  ['newsletter-popup', 'newsletter-popup email-capture subscribe-modal'],
  ['cookie-consent', 'cookie-banner cookie-consent gdpr-consent'],
  ['taboola', 'taboola-outbrain trc_rbox'],
  ['outbrain', 'outbrain-widget ob-widget'],
  ['yandex-direct', 'yandex_rtb yandex-direct'],
  ['amazon-ads', 'amzn-native-ad apstag-ad'],
  ['video-ads', 'video-ads preroll-ads ima-ad-container'],
  ['affiliate', 'affiliate-link affiliate-widget']
]);

export function createPluginsCollector() {
  return createCollector({
    id: 'browser.plugins',
    version: '1',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.8,
    collect(context) {
      const plugins = context.navigator && context.navigator.plugins;
      if (!plugins) {
        return null;
      }

      return toArrayLike(plugins).map((plugin) => ({
        name: safeString(plugin.name),
        description: safeString(plugin.description),
        filename: safeString(plugin.filename),
        mimeTypes: toArrayLike(plugin).map((mimeType) => ({
          type: safeString(mimeType.type),
          suffixes: safeString(mimeType.suffixes)
        }))
      })).sort((left, right) => String(left.name).localeCompare(String(right.name)));
    }
  });
}

export function createVendorFlavorsCollector() {
  return createCollector({
    id: 'browser.vendorFlavors',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.55,
    collect(context) {
      const windowRef = getWindowRef(context);
      const flavors = [];

      for (const [label, property] of VENDOR_GLOBALS) {
        if (property in windowRef) {
          flavors.push(label);
        }
      }

      return flavors.sort();
    }
  });
}

export function createPdfViewerCollector() {
  return createCollector({
    id: 'browser.pdfViewer',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.35,
    collect(context) {
      const navigatorRef = context.navigator;
      if (!navigatorRef) {
        return null;
      }

      return safeBoolean(navigatorRef.pdfViewerEnabled);
    }
  });
}

export function createApplePayCollector() {
  return createCollector({
    id: 'browser.applePay',
    version: '1',
    category: 'payments',
    sensitivity: 'medium',
    mode: 'passive',
    stability: 'stable',
    weight: 0.45,
    hashable: false,
    collect(context) {
      const windowRef = getWindowRef(context);
      const ApplePaySession = windowRef.ApplePaySession;
      if (!ApplePaySession || typeof ApplePaySession.canMakePayments !== 'function') {
        return { status: 'no_api' };
      }

      if (windowRef.isSecureContext === false) {
        return { status: 'insecure_context' };
      }

      try {
        return { status: ApplePaySession.canMakePayments() ? 'enabled' : 'disabled' };
      } catch (error) {
        return { status: 'error', message: error && error.message ? String(error.message) : 'apple_pay_error' };
      }
    }
  });
}

export function createPrivateClickMeasurementCollector() {
  return createCollector({
    id: 'browser.privateClickMeasurement',
    version: '1',
    category: 'runtime',
    sensitivity: 'low',
    mode: 'passive',
    stability: 'stable',
    weight: 0.25,
    hashable: false,
    collect(context) {
      const documentRef = context.document;
      if (!documentRef || typeof documentRef.createElement !== 'function') {
        return null;
      }

      const link = documentRef.createElement('a');
      const sourceId = Object.prototype.hasOwnProperty.call(link, 'attributionSourceId')
        ? link.attributionSourceId
        : link.attributionsourceid;

      if (sourceId === undefined) {
        return null;
      }

      return String(sourceId);
    }
  });
}

export function createDomBlockersCollector() {
  return createCollector({
    id: 'browser.domBlockers',
    version: '2',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'active',
    stability: 'volatile',
    weight: 0.65,
    hashable: false,
    collect(context) {
      const documentRef = context.document;
      if (!documentRef || !documentRef.body || typeof documentRef.createElement !== 'function') {
        return null;
      }

      const windowRef = getWindowRef(context);
      const container = documentRef.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '-10000px';

      const baitElements = createBaitElements(documentRef);
      for (const bait of baitElements) {
        container.appendChild(bait.element);
      }

      documentRef.body.appendChild(container);
      try {
        const blocked = baitElements
          .filter((bait) => isBlocked(bait.element, windowRef))
          .map((bait) => bait.name)
          .sort();

        return { checked: baitElements.length, blocked, checksum: blocked.join('|') };
      } finally {
        if (container.parentNode && typeof container.parentNode.removeChild === 'function') {
          container.parentNode.removeChild(container);
        }
      }
    }
  });
}

function createBaitElements(documentRef) {
  return DOM_BLOCKER_BAITS.map(([name, className]) => {
    const element = documentRef.createElement('div');
    element.className = className;
    element.textContent = name;
    element.style.width = '1px';
    element.style.height = '1px';
    return { name, element };
  });
}

function isBlocked(element, windowRef) {
  if (element.offsetParent === null || element.offsetHeight === 0 || element.offsetWidth === 0) {
    return true;
  }

  if (typeof windowRef.getComputedStyle !== 'function') {
    return false;
  }

  const style = windowRef.getComputedStyle(element);
  return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
}

function collectFeatureGroup(source, features) {
  return Object.fromEntries(features.map((feature) => [feature, hasProperty(source, feature)]));
}

function hasProperty(source, feature) {
  try {
    return Boolean(feature in source);
  } catch (_error) {
    return false;
  }
}

function supportsCss(cssRef, property, value) {
  try {
    return Boolean(cssRef.supports(property, value));
  } catch (_error) {
    return null;
  }
}

function toMegabytes(value) {
  const number = safeNumber(value);
  return number === null ? null : Math.round(number / 1024 / 1024);
}