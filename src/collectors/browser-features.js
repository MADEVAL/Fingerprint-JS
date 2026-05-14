import { createCollector } from './core.js';
import { getWindowRef, safeBoolean, safeString, toArrayLike } from './shared.js';

const VENDOR_GLOBALS = Object.freeze([
  ['chrome', 'chrome'],
  ['safari', 'safari'],
  ['firefoxIos', '__firefox__'],
  ['chromeIos', '__crWeb'],
  ['edgeIos', '__edgeTrackingPreventionStatistics'],
  ['yandex', 'yandex'],
  ['opera', 'opr']
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
    version: '1',
    category: 'runtime',
    sensitivity: 'medium',
    mode: 'active',
    stability: 'volatile',
    weight: 0.65,
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

        return { checked: baitElements.length, blocked };
      } finally {
        if (container.parentNode && typeof container.parentNode.removeChild === 'function') {
          container.parentNode.removeChild(container);
        }
      }
    }
  });
}

function createBaitElements(documentRef) {
  const baits = [
    ['generic-ad', 'ad adsbox advertisement banner_ad'],
    ['sponsor', 'sponsor sponsored-link'],
    ['analytics', 'tracking analytics pixel']
  ];

  return baits.map(([name, className]) => {
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