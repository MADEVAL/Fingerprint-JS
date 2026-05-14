import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCollectors } from '../src/index.js';

function collector(id) {
  const found = createDefaultCollectors().find((item) => item.id === id);
  assert.ok(found, `Missing collector ${id}`);
  return found;
}

test('browser runtime collector handles navigator data and missing navigator', () => {
  const runtime = collector('runtime.browser');
  const value = runtime.collect({
    navigator: {
      userAgent: 'Agent/1',
      platform: 'Win32',
      vendor: 'Vendor',
      productSub: '20030107',
      webdriver: true,
      userAgentData: {
        brands: [
          { brand: 'Zulu', version: '2' },
          { brand: 'Alpha', version: '1' }
        ],
        mobile: true,
        platform: 'Windows'
      }
    }
  });

  assert.equal(value.userAgent, 'Agent/1');
  assert.equal(value.webdriver, true);
  assert.deepEqual(value.userAgentData.brands, [
    { brand: 'Alpha', version: '1' },
    { brand: 'Zulu', version: '2' }
  ]);
  assert.deepEqual(runtime.collect({
    navigator: { userAgentData: { brands: 'not-an-array' } }
  }).userAgentData.brands, []);
  assert.equal(runtime.collect({
    navigator: { userAgent: 'Agent/2' }
  }).userAgentData, null);
  assert.deepEqual(runtime.collect({
    navigator: { userAgentData: { brands: [{ brand: '', version: '' }] } }
  }).userAgentData.brands, [{ brand: null, version: null }]);
  assert.equal(runtime.collect({ navigator: null }), null);
});

test('locale and timezone collectors handle missing Intl and sparse navigator data', () => {
  const previousIntl = Object.getOwnPropertyDescriptor(globalThis, 'Intl');
  Object.defineProperty(globalThis, 'Intl', { configurable: true, value: undefined });

  try {
    const locale = collector('locale').collect({ navigator: {} });
    const timezone = collector('timezone').collect({});

    assert.equal(locale.language, null);
    assert.deepEqual(locale.languages, []);
    assert.equal(locale.locale, null);
    assert.equal(timezone.timeZone, null);
  } finally {
    restoreGlobalProperty('Intl', previousIntl);
  }
});

test('runtime, locale, timezone, screen, hardware, and storage collectors return expected data', () => {
  const nodeRuntime = collector('runtime.node').collect({});
  assert.equal(nodeRuntime.platform, process.platform);
  assert.equal(collector('runtime.node').collect({ global: { process: null } }), null);

  const locale = collector('locale').collect({
    navigator: { language: 'en-US', languages: ['en-US', 'fr-FR'] }
  });
  assert.equal(locale.language, 'en-US');
  assert.deepEqual(locale.languages, ['en-US', 'fr-FR']);

  const timezone = collector('timezone').collect({});
  assert.equal(typeof timezone.offsetMinutes, 'number');

  const screen = collector('screen.metrics').collect({
    global: { devicePixelRatio: 2 },
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1900,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: Number.NaN
    }
  });
  assert.equal(screen.devicePixelRatio, 2);
  assert.equal(screen.pixelDepth, null);
  assert.equal(collector('screen.metrics').collect({ screen: null }), null);

  const hardware = collector('hardware').collect({
    navigator: {
      hardwareConcurrency: 8,
      deviceMemory: 16,
      maxTouchPoints: 5
    }
  });
  assert.equal(hardware.hardwareConcurrency, 8);
  assert.equal(collector('hardware').collect({ navigator: null }), null);

  const storageState = new Map();
  const storage = {
    setItem: (key, value) => storageState.set(key, value),
    removeItem: (key) => storageState.delete(key)
  };
  const capabilities = collector('storage.capabilities').collect({
    global: { localStorage: storage, sessionStorage: storage },
    navigator: { cookieEnabled: true, doNotTrack: '1' }
  });
  assert.equal(capabilities.cookieEnabled, true);
  assert.equal(capabilities.localStorage, true);
  assert.equal(capabilities.sessionStorage, true);

  const sparseCapabilities = collector('storage.capabilities').collect({
    global: {},
    navigator: {}
  });
  assert.equal(sparseCapabilities.doNotTrack, null);
});

test('storage capabilities collector reports unavailable and throwing storage', () => {
  const throwingStorage = {
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {}
  };
  const capabilities = collector('storage.capabilities').collect({
    global: { localStorage: throwingStorage, sessionStorage: {} },
    navigator: null
  });

  assert.equal(capabilities.cookieEnabled, null);
  assert.equal(capabilities.localStorage, false);
  assert.equal(capabilities.sessionStorage, false);
});

test('WebGL collector handles unavailable, available, and throwing parameter paths', () => {
  const webgl = collector('webgl.renderer');

  assert.equal(webgl.collect({ document: null }), null);
  assert.equal(webgl.collect({ document: { createElement: () => ({ getContext: () => null }) } }), null);

  const gl = {
    VENDOR: 1,
    RENDERER: 2,
    VERSION: 3,
    SHADING_LANGUAGE_VERSION: 4,
    getExtension(name) {
      assert.equal(name, 'WEBGL_debug_renderer_info');
      return {
        UNMASKED_VENDOR_WEBGL: 5,
        UNMASKED_RENDERER_WEBGL: 6
      };
    },
    getParameter(parameter) {
      if (parameter === 1) {
        return 'Vendor';
      }
      if (parameter === 2) {
        return 'Renderer';
      }
      if (parameter === 3) {
        return 1;
      }
      if (parameter === 4) {
        return true;
      }
      if (parameter === 5) {
        throw new Error('blocked');
      }
      return { unsupported: true };
    }
  };

  const value = webgl.collect({
    document: {
      createElement: () => ({
        getContext: (type) => (type === 'webgl' ? gl : null)
      })
    }
  });

  assert.equal(value.vendor, 'Vendor');
  assert.equal(value.renderer, 'Renderer');
  assert.equal(value.version, 1);
  assert.equal(value.shadingLanguageVersion, true);
  assert.equal(value.unmaskedVendor, null);
  assert.equal(value.unmaskedRenderer, null);

  const withoutDebugInfo = webgl.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          VENDOR: 1,
          RENDERER: 2,
          VERSION: 3,
          SHADING_LANGUAGE_VERSION: 4,
          getParameter: () => 'basic'
        })
      })
    }
  });
  assert.equal(withoutDebugInfo.unmaskedVendor, null);
  assert.equal(withoutDebugInfo.unmaskedRenderer, null);
});

test('canvas collector handles unavailable and available canvas paths', () => {
  const canvas = collector('canvas.checksum');

  assert.equal(canvas.collect({ document: null }), null);
  assert.equal(canvas.collect({ document: { createElement: () => ({ getContext: () => null }) } }), null);

  const operations = [];
  const context = {
    set textBaseline(value) {
      operations.push(['textBaseline', value]);
    },
    set font(value) {
      operations.push(['font', value]);
    },
    set fillStyle(value) {
      operations.push(['fillStyle', value]);
    },
    set globalCompositeOperation(value) {
      operations.push(['globalCompositeOperation', value]);
    },
    fillRect(...args) {
      operations.push(['fillRect', ...args]);
    },
    fillText(...args) {
      operations.push(['fillText', ...args]);
    },
    beginPath() {
      operations.push(['beginPath']);
    },
    arc(...args) {
      operations.push(['arc', ...args]);
    },
    closePath() {
      operations.push(['closePath']);
    },
    fill() {
      operations.push(['fill']);
    }
  };
  const fakeCanvas = {
    getContext: (type) => (type === '2d' ? context : null),
    toDataURL: () => `data:image/png;base64,${operations.length}`
  };

  const value = canvas.collect({
    document: { createElement: () => fakeCanvas }
  });

  assert.equal(value.length, 'data:image/png;base64,11'.length);
  assert.match(value.checksum, /^[a-f0-9]{16}$/u);
});

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}
