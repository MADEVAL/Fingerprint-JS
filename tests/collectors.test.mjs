import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBrowserQuirks, getSuppressionReason, shouldSuppressSignal } from '../src/browser-quirks.js';
import { createCollector, createDefaultCollectors } from '../src/index.js';

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
  assert.equal(value.appVersion, null);
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

test('navigator properties collector separates low-level browser properties', () => {
  const properties = collector('runtime.navigatorProperties');

  assert.equal(properties.collect({ navigator: null }), null);
  assert.deepEqual(properties.collect({ navigator: {} }), {
    vendor: null,
    vendorSub: null,
    product: null,
    productSub: null,
    oscpu: null,
    cpuClass: null,
    buildId: null
  });

  const value = properties.collect({
    navigator: {
      vendor: 'Vendor',
      vendorSub: 'Sub',
      product: 'Gecko',
      productSub: '20100101',
      oscpu: 'Windows NT 10.0',
      cpuClass: 'x86',
      buildID: 'build'
    }
  });

  assert.equal(value.oscpu, 'Windows NT 10.0');
  assert.equal(value.buildId, 'build');
});

test('collector validation rejects invalid prepare handlers', () => {
  assert.throws(() => createCollector({ id: 'bad.prepare', collect: () => null, prepare: true }), /prepare must be a function/u);
});

test('client hints collector handles basic, high entropy, and failure paths', async () => {
  const clientHints = collector('runtime.clientHints');

  assert.equal(await clientHints.collect({ navigator: {} }), null);

  const basic = await clientHints.collect({
    navigator: {
      userAgentData: {
        brands: [{ brand: 'Brand', version: '1' }],
        mobile: false,
        platform: 'Windows'
      }
    }
  });
  assert.equal(basic.highEntropy, null);
  assert.equal(basic.basic.platform, 'Windows');

  const high = await clientHints.collect({
    navigator: {
      userAgentData: {
        brands: [],
        mobile: true,
        platform: 'Android',
        async getHighEntropyValues(hints) {
          assert.ok(hints.includes('architecture'));
          return {
            architecture: 'arm',
            bitness: '64',
            model: 'Phone',
            platformVersion: '15',
            uaFullVersion: '100.0.0.0',
            fullVersionList: [{ brand: 'Z', version: '2' }],
            wow64: false
          };
        }
      }
    }
  });
  assert.equal(high.highEntropy.architecture, 'arm');
  assert.equal(high.highEntropy.wow64, false);

  const failed = await clientHints.collect({
    navigator: {
      userAgentData: {
        brands: [],
        mobile: false,
        platform: 'Linux',
        async getHighEntropyValues() {
          throw new Error('denied');
        }
      }
    }
  });
  assert.equal(failed.highEntropy, null);
  assert.equal(failed.error, 'denied');

  const failedWithoutMessage = await clientHints.collect({
    navigator: {
      userAgentData: {
        brands: [],
        mobile: false,
        platform: 'Linux',
        async getHighEntropyValues() {
          throw 'denied';
        }
      }
    }
  });
  assert.equal(failedWithoutMessage.error, 'client_hints_unavailable');

  const sparseHigh = await clientHints.collect({
    navigator: {
      userAgentData: {
        brands: [{ brand: '', version: '' }],
        mobile: false,
        platform: '',
        async getHighEntropyValues() {
          return {};
        }
      }
    }
  });
  assert.equal(sparseHigh.basic.platform, null);
  assert.equal(sparseHigh.highEntropy.architecture, null);
  assert.equal(sparseHigh.highEntropy.wow64, null);
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

test('date time locale collector reads calendar preferences from context Intl', () => {
  const dateTime = collector('locale.datetime');
  const value = dateTime.collect({
    global: {
      Intl: {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23' })
        })
      }
    }
  });

  assert.deepEqual(value, { calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23' });
  assert.deepEqual(dateTime.collect({ global: { Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({}) }) } } }), {
    calendar: null,
    numberingSystem: null,
    hourCycle: null
  });
  assert.equal(typeof collector('timezone').collect().offsetMinutes, 'number');
});

test('runtime, locale, timezone, screen, hardware, and storage collectors return expected data', () => {
  const nodeRuntime = collector('runtime.node').collect({});
  assert.equal(nodeRuntime.platform, process.platform);
  assert.equal(collector('runtime.node').collect({ global: { process: { versions: {} } } }), null);
  assert.equal(collector('runtime.node').collect({ global: { process: { versions: { node: '1' }, platform: 'x', arch: 'y' } } }).arch, 'y');
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
  assert.equal(collector('screen.metrics').collect({ screen: { width: 1.4, height: 2.6 } }).devicePixelRatio, null);
  assert.equal(collector('screen.metrics').collect({ screen: null }), null);
  assert.equal(collector('screen.metrics').collect({
    screen: { width: 1000, height: 1000 },
    navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 2 }
  }).status, 'suppressed');

  const hardware = collector('hardware').collect({
    navigator: {
      hardwareConcurrency: 8,
      deviceMemory: 16,
      maxTouchPoints: 5
    }
  });
  assert.equal(hardware.hardwareConcurrency, 8);
  assert.equal(collector('hardware').collect({ navigator: { userAgent: 'Chrome/120 Safari/537.36' } }).hardwareConcurrency, null);
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
  assert.equal(capabilities.indexedDB, false);
  assert.equal(capabilities.openDatabase, false);
  assert.equal(capabilities.sessionStorage, true);

  const sparseCapabilities = collector('storage.capabilities').collect({
    global: {},
    navigator: {}
  });
  assert.equal(sparseCapabilities.doNotTrack, null);
});

test('storage capabilities handles feature getters that throw', () => {
  const globalRef = {};
  Object.defineProperty(globalRef, 'indexedDB', {
    get() {
      throw new Error('private mode');
    }
  });
  globalRef.openDatabase = () => null;

  const capabilities = collector('storage.capabilities').collect({
    global: globalRef,
    navigator: { cookieEnabled: false }
  });

  assert.equal(capabilities.indexedDB, true);
  assert.equal(capabilities.openDatabase, true);

  const normal = collector('storage.capabilities').collect({
    global: { indexedDB: {} },
    navigator: null
  });
  assert.equal(normal.indexedDB, true);
});

test('bot detection collector scores automation evidence conservatively', () => {
  const botDetection = collector('browser.botDetection');

  const human = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
      language: 'en-US',
      languages: ['en-US'],
      hardwareConcurrency: 8,
      deviceMemory: 8,
      plugins: { length: 1, 0: { name: 'PDF Viewer' } },
      mimeTypes: { length: 1, 0: { type: 'application/pdf' } }
    },
    window: { outerWidth: 1200, outerHeight: 800, innerWidth: 1180, innerHeight: 760 }
  });
  assert.equal(human.verdict, 'likely_human');
  assert.deepEqual(human.evidence, []);

  const bot = botDetection.collect({
    navigator: {
      webdriver: true,
      userAgent: 'Mozilla/5.0 HeadlessChrome/120.0 Safari/537.36',
      language: 'en-US',
      languages: [],
      plugins: { length: 0 },
      mimeTypes: { length: 0 }
    },
    window: {
      __webdriver_evaluate: true,
      __playwright__binding__: true,
      outerWidth: 0,
      outerHeight: 0,
      innerWidth: 1024,
      innerHeight: 768
    }
  });
  assert.equal(bot.verdict, 'bot');
  assert.equal(bot.score, 1);
  assert.equal(bot.confidence, 'high');
  assert.ok(bot.evidence.includes('navigator.webdriver'));
  assert.ok(bot.evidence.includes('automation.globals'));
  assert.ok(bot.evidence.includes('headless.userAgent'));

  const weak = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
      language: 'en-US',
      languages: [],
      plugins: { length: 0 },
      mimeTypes: { length: 0 }
    },
    window: {}
  });
  assert.equal(weak.verdict, 'likely_human');
  assert.equal(weak.confidence, 'low');

  const suspicious = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      language: '',
      languages: ['en-US', '', 3],
      plugins: null,
      mimeTypes: null
    },
    window: { __nightmare: true, outerWidth: 0, outerHeight: 0, innerWidth: 0, innerHeight: 10 }
  });
  assert.equal(suspicious.verdict, 'suspicious');
  assert.equal(suspicious.confidence, 'medium');

  const sparse = botDetection.collect({ window: {} });
  assert.equal(sparse.verdict, 'likely_human');

  const inconsistent = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
      language: 'bad locale!',
      languages: ['fr-FR', 'fr-FR'],
      hardwareConcurrency: 0,
      deviceMemory: 256,
      plugins: { length: 1, 0: { name: 'PDF Viewer', length: 0 } },
      mimeTypes: { length: 0 },
      permissions: { query() {} }
    },
    window: { chrome: {} }
  });
  assert.equal(inconsistent.verdict, 'suspicious');
  assert.ok(inconsistent.evidence.includes('language.mismatch'));
  assert.ok(inconsistent.evidence.includes('impossible.hardware'));
  assert.ok(inconsistent.evidence.includes('plugin.inconsistency'));
  assert.ok(inconsistent.evidence.includes('permissions.queryPatched'));
  assert.ok(inconsistent.evidence.includes('empty.chrome.global'));

  const pluginMismatch = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      language: 'en-US',
      languages: ['en-US'],
      plugins: {
        length: 3,
        0: { name: 'PDF One', length: 1 },
        1: { name: 'Acrobat Two', length: 0 },
        2: { name: 'PDF Three', length: 0 }
      },
      mimeTypes: { length: 1, 0: { type: 'application/pdf' } }
    },
    window: {}
  });
  assert.ok(pluginMismatch.evidence.includes('plugin.inconsistency'));

  const brokenPluginEntry = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      language: 'en-US',
      languages: ['en-US'],
      plugins: { length: 1, 0: { name: 'Media Plugin', length: 1 } },
      mimeTypes: { length: 1, 0: { type: 'video/mp4' } }
    },
    window: { chrome: true }
  });
  assert.ok(brokenPluginEntry.evidence.includes('plugin.inconsistency'));

  const validPluginEntry = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      language: 'en-US',
      languages: ['en-US'],
      hardwareConcurrency: 256,
      deviceMemory: 0.125,
      plugins: { length: 1, 0: { name: 'Media Plugin', length: 1, 0: { type: 'video/mp4' } } },
      mimeTypes: { length: 1, 0: { type: 'video/mp4' } }
    },
    window: { outerWidth: 0, outerHeight: 1, innerWidth: 0, innerHeight: 0 }
  });
  assert.equal(validPluginEntry.evidence.includes('plugin.inconsistency'), false);
  assert.ok(validPluginEntry.evidence.includes('impossible.hardware'));

  const chromeRuntime = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0 Firefox/120.0 Safari/537.36',
      language: 'en-US',
      languages: ['en-US'],
      plugins: { length: 1, 0: { name: 'PDF Viewer' } },
      mimeTypes: { length: 1, 0: { type: 'application/pdf' } }
    },
    window: { chrome: { runtime: {} } }
  });
  assert.equal(chromeRuntime.evidence.includes('empty.chrome.global'), false);
  assert.equal(chromeRuntime.evidence.includes('empty.chrome.plugins'), false);

  const unnamedPlugin = botDetection.collect({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      language: 'en-US',
      languages: ['en-US'],
      plugins: { length: 1, 0: { name: '', length: 0 } },
      mimeTypes: { length: 1, 0: { type: 'application/x-test' } }
    },
    window: {}
  });
  assert.equal(unnamedPlugin.evidence.includes('plugin.inconsistency'), false);

  const originalNativeToString = Function.prototype.toString;
  Function.prototype.toString = () => 'function query() { [native code] }';
  try {
    const nativePermissions = botDetection.collect({
      navigator: { permissions: { query() {} } },
      window: {}
    });
    assert.equal(nativePermissions.evidence.includes('permissions.queryPatched'), false);
  } finally {
    Function.prototype.toString = originalNativeToString;
  }

  const originalFunctionToString = Function.prototype.toString;
  Function.prototype.toString = function toStringThatThrows() {
    throw new Error('blocked toString');
  };
  try {
    const permissionsFallback = botDetection.collect({
      navigator: { permissions: { query() {} } },
      window: {}
    });
    assert.equal(permissionsFallback.evidence.includes('permissions.queryPatched'), false);
  } finally {
    Function.prototype.toString = originalFunctionToString;
  }
});

test('privacy mode collector reports browser-only private-mode indicators', async () => {
  const privacy = collector('browser.privacyMode');

  const unsupported = await privacy.collect({ global: { process: { versions: { node: '24.0.0' } } }, document: null });
  assert.equal(unsupported.verdict, 'unsupported');

  const available = await privacy.collect({
    document: {},
    global: {
      localStorage: createFakeStorage(),
      sessionStorage: createFakeStorage(),
      indexedDB: createFakeIndexedDb('success')
    },
    navigator: {
      storage: {
        estimate: async () => ({ quota: 1024 * 1024 * 1024, usage: 1024 }),
        persisted: async () => true
      }
    }
  });
  assert.equal(available.verdict, 'no_private_evidence');
  assert.deepEqual(available.evidence, []);

  const likelyPrivate = await privacy.collect({
    document: {},
    global: {
      localStorage: createThrowingStorage(),
      sessionStorage: createThrowingStorage(),
      indexedDB: createFakeIndexedDb('error')
    },
    navigator: {
      storage: {
        estimate: async () => ({ quota: 64 * 1024 * 1024, usage: Number.NaN }),
        persisted: async () => false
      }
    }
  });
  assert.equal(likelyPrivate.verdict, 'likely_private');
  assert.ok(likelyPrivate.evidence.includes('localStorage.blocked'));
  assert.ok(likelyPrivate.evidence.includes('indexedDB.blocked'));
  assert.ok(likelyPrivate.evidence.includes('storage.lowQuota'));

  const missingIndexedDb = await privacy.collect({ document: {}, global: {}, navigator: {} });
  assert.equal(missingIndexedDb.verdict, 'likely_private');
  assert.equal(missingIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'missing');

  const browserLikeWithoutDocument = await privacy.collect({ global: {}, navigator: {} });
  assert.equal(browserLikeWithoutDocument.verdict, 'likely_private');

  const blockedIndexedDb = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: createFakeIndexedDb('blocked') },
    navigator: { storage: { estimate: async () => { throw new Error('quota denied'); }, persisted: async () => { throw new Error('persist denied'); } } }
  });
  assert.equal(blockedIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'blocked');
  assert.equal(blockedIndexedDb.checks.find((check) => check.name === 'storage.lowQuota').detail, 'unavailable');

  const exceptionalIndexedDb = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: { open: () => { throw new Error('idb denied'); } } },
    navigator: {}
  });
  assert.equal(exceptionalIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'exception');

  const unknownIndexedDb = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: { open: () => null } },
    navigator: {}
  });
  assert.equal(unknownIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'unknown');

  const nonObjectIndexedDb = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: { open: () => 1 } },
    navigator: { storage: {} }
  });
  assert.equal(nonObjectIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'unknown');

  const nonFunctionIndexedDb = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: { open: true } },
    navigator: { storage: {} }
  });
  assert.equal(nonFunctionIndexedDb.checks.find((check) => check.name === 'indexedDB.blocked').detail, 'missing');

  const possiblePrivate = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: createFakeIndexedDb('blocked') },
    navigator: { storage: { estimate: async () => ({ quota: 0, usage: 0 }), persisted: async () => true } }
  });
  assert.equal(possiblePrivate.verdict, 'possible_private');
  assert.equal(possiblePrivate.confidence, 'low');

  const nullQuota = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: createFakeIndexedDb('success-no-cleanup') },
    navigator: { storage: { estimate: async () => ({}), persisted: async () => true } }
  });
  assert.equal(nullQuota.checks.find((check) => check.name === 'storage.lowQuota').detail.quota, null);

  const nullDatabase = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: createFakeIndexedDb('success-null-result') },
    navigator: { storage: { estimate: async () => ({ quota: 1024 * 1024 * 1024 }), persisted: async () => true } }
  });
  assert.equal(nullDatabase.verdict, 'no_private_evidence');

  const omittedNavigator = await privacy.collect({
    document: {},
    global: { localStorage: createFakeStorage(), sessionStorage: createFakeStorage(), indexedDB: createFakeIndexedDb('success') }
  });
  assert.equal(omittedNavigator.verdict, 'no_private_evidence');

  const omittedGlobal = await privacy.collect({ document: {}, navigator: {} });
  assert.equal(omittedGlobal.verdict, 'likely_private');
});

test('browser quirk detection marks unstable browser modes', () => {
  const safari = detectBrowserQuirks({
    navigator: {
      userAgent: 'Mozilla/5.0 AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
      hardwareConcurrency: 8
    },
    window: { safari: {} }
  });

  assert.equal(safari.isSafari17OrNewer, true);
  assert.equal(shouldSuppressSignal('audio', safari), true);
  assert.equal(shouldSuppressSignal('canvas', safari), true);
  assert.equal(shouldSuppressSignal('unknown', safari), false);

  const firefoxRfp = detectBrowserQuirks({
    navigator: {
      userAgent: 'Mozilla/5.0 Firefox/143.0',
      platform: 'Linux x86_64',
      hardwareConcurrency: 2
    },
    screen: { width: 1000, height: 1000 }
  });

  assert.equal(firefoxRfp.engine, 'gecko');
  assert.equal(shouldSuppressSignal('canvas', firefoxRfp), true);
  assert.equal(shouldSuppressSignal('screen.metrics', firefoxRfp), true);
  assert.equal(shouldSuppressSignal('screen.frame', firefoxRfp), true);
  assert.equal(shouldSuppressSignal('hardware.concurrency', firefoxRfp), false);

  const firefox120 = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 Firefox/120.0' } });
  assert.equal(shouldSuppressSignal('canvas', firefox120), true);
  assert.equal(getSuppressionReason('canvas', firefox120), 'firefox_canvas_randomization');

  const firefox143Screen = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 Firefox/143.0', hardwareConcurrency: 8 } });
  assert.equal(getSuppressionReason('screen.frame', firefox143Screen), 'firefox_screen_frame_randomization');

  const samsung26 = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 SamsungBrowser/26.0 Chrome/120.0 Safari/537.36' } });
  assert.equal(shouldSuppressSignal('audio', samsung26), true);
  assert.equal(getSuppressionReason('audio', samsung26), 'samsung_internet_audio_instability');

  const oldMobileSafari = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 iPhone Version/11.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' } });
  assert.equal(shouldSuppressSignal('audio', oldMobileSafari), true);
  assert.equal(getSuppressionReason('audio', oldMobileSafari), 'old_mobile_safari_audio_requires_gesture');
  assert.equal(getSuppressionReason('unknown', detectBrowserQuirks()), null);

  const chromium = detectBrowserQuirks({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36 SamsungBrowser/25.0 Android',
      platform: 'Linux armv8l',
      userAgentData: { brands: [{ brand: 'Chromium', version: '120' }, { brand: 'Samsung Internet', version: '25' }] }
    }
  });

  assert.equal(chromium.isChromium, true);
  assert.equal(chromium.isSamsungInternet, true);
  assert.equal(chromium.isAndroid, true);

  assert.equal(detectBrowserQuirks({ window: { chrome: { runtime: {} } } }).isChromium, true);
  assert.equal(detectBrowserQuirks({ window: { chrome: { loadTimes: () => null } } }).isChromium, true);
  assert.equal(detectBrowserQuirks({ window: { chrome: { csi: () => null } } }).isChromium, true);

  const iosFromUserAgent = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 iPhone Safari/604.1', platform: 'MacIntel', maxTouchPoints: 0 } });
  assert.equal(iosFromUserAgent.isIos, true);

  const firefoxIos = detectBrowserQuirks({ navigator: { userAgent: 'Mozilla/5.0 iPhone FxiOS/123.0 Mobile/15E148 Safari/605.1.15', platform: 'iPhone' } });
  assert.equal(firefoxIos.firefoxIosMajor, 123);
  assert.equal(firefoxIos.isSafari, false);

  const iosDesktop = detectBrowserQuirks({
    navigator: {
      userAgent: 'Mozilla/5.0 AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      userAgentData: { platform: 'Android', brands: [{}, { brand: 'Samsung Internet', version: '1' }] }
    },
    global: { safari: {} }
  });
  assert.equal(iosDesktop.isIos, true);
  assert.equal(iosDesktop.isIosDesktopMode, true);
  assert.equal(iosDesktop.isAndroid, true);
  assert.equal(iosDesktop.isSamsungInternet, true);

  const cssGecko = detectBrowserQuirks({
    window: { CSS: { supports: (property) => property === '-moz-appearance' } }
  });
  assert.equal(cssGecko.isFirefox, true);

  const cssWebKit = detectBrowserQuirks({
    window: { CSS: { supports: (property) => property === '-webkit-touch-callout' } }
  });
  assert.equal(cssWebKit.engine, 'webkit');

  const geckoWindow = detectBrowserQuirks({ window: { mozInnerScreenX: 1 } });
  assert.equal(geckoWindow.isFirefox, true);

  const cssThrow = detectBrowserQuirks({
    window: { CSS: { supports: () => { throw new Error('css unavailable'); } } }
  });
  assert.equal(cssThrow.engine, 'unknown');

  const unknown = detectBrowserQuirks();
  assert.equal(unknown.engine, 'unknown');
});

test('screen frame and media preferences collectors handle stable and suppressed paths', () => {
  const screenFrame = collector('screen.frame');

  assert.equal(screenFrame.collect({ screen: null }), null);
  const zeroWithoutCache = screenFrame.collect({
    global: {},
    window: { outerWidth: 500, outerHeight: 400, innerWidth: 500, innerHeight: 400 },
    screen: { width: 800, height: 600, availWidth: 800, availHeight: 600 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36', platform: 'Win32' }
  });
  assert.equal(zeroWithoutCache.cached, false);
  const stableFrame = screenFrame.collect({
    global: {},
    window: { outerWidth: 1000, outerHeight: 800, innerWidth: 980, innerHeight: 760, screenX: 5, screenY: 7 },
    screen: { width: 1200, height: 900, availWidth: 1180, availHeight: 870 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36', platform: 'Win32' }
  });
  assert.equal(stableFrame.frameWidth, 20);
  assert.equal(stableFrame.availDeltaHeight, 30);

  const sparseFrame = screenFrame.collect({
    global: {},
    window: { screenLeft: 1, screenTop: 2 },
    screen: {},
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(sparseFrame.left, 1);
  assert.equal(sparseFrame.frameWidth, null);
  assert.equal(sparseFrame.availDeltaWidth, null);

  const cachedFrame = screenFrame.collect({
    global: {},
    window: { outerWidth: 980, outerHeight: 760, innerWidth: 980, innerHeight: 760 },
    screen: { width: 1200, height: 900, availWidth: 1200, availHeight: 900 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36', platform: 'Win32' }
  });
  assert.equal(cachedFrame.cached, true);
  assert.equal(cachedFrame.frameWidth, 20);

  const watchedEvents = {};
  const watchedContext = {
    global: {},
    window: {
      outerWidth: 1200.4,
      outerHeight: 900.4,
      innerWidth: 1160.1,
      innerHeight: 840.2,
      screenX: 3.6,
      screenY: 4.4,
      addEventListener(name, handler) {
        watchedEvents[name] = handler;
      }
    },
    screen: { width: 1440, height: 960, availWidth: 1400, availHeight: 900 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36', platform: 'Win32' }
  };
  const watchedFrame = screenFrame.collect(watchedContext);
  assert.equal(watchedFrame.rounded, true);
  watchedEvents.resize();
  watchedContext.window.outerWidth = 1160;
  watchedContext.window.outerHeight = 840;
  watchedContext.screen.availWidth = 1440;
  watchedContext.screen.availHeight = 960;
  watchedEvents.resize();
  watchedContext.window.outerWidth = 1200;
  watchedContext.window.outerHeight = 900;
  watchedContext.window.innerWidth = 1160;
  watchedContext.window.innerHeight = 840;
  watchedContext.screen.availWidth = 1400;
  watchedContext.screen.availHeight = 900;
  watchedContext.document = { fullscreenElement: {} };
  watchedEvents.orientationchange();
  delete watchedContext.document;
  delete watchedContext.window.screenX;
  delete watchedContext.window.screenY;
  watchedContext.window.screenLeft = 6;
  watchedContext.window.screenTop = 8;
  delete watchedContext.window.outerWidth;
  delete watchedContext.window.outerHeight;
  delete watchedContext.screen.width;
  delete watchedContext.screen.height;
  delete watchedContext.screen.availWidth;
  delete watchedContext.screen.availHeight;
  watchedEvents.resize();
  const watchedCachedFrame = screenFrame.collect({
    global: {},
    window: { outerWidth: 800, outerHeight: 600, innerWidth: 800, innerHeight: 600 },
    screen: { width: 1440, height: 960, availWidth: 1440, availHeight: 960 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36', platform: 'Win32' }
  });
  assert.equal(watchedCachedFrame.source, 'cache');
  assert.equal(watchedCachedFrame.frameWidth, 40);

  const fullscreenFrame = screenFrame.collect({
    window: { outerWidth: 980, outerHeight: 760, innerWidth: 980, innerHeight: 760, fullScreen: true },
    screen: { width: 1200, height: 900, availWidth: 1200, availHeight: 900 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(fullscreenFrame.fullscreen, true);
  assert.equal(fullscreenFrame.cached, false);

  const documentFullscreenFrame = screenFrame.collect({
    document: { fullscreenElement: {} },
    window: { outerWidth: 100, outerHeight: 100, innerWidth: 90, innerHeight: 90 },
    screen: { width: 100, height: 100, availWidth: 90, availHeight: 90 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(documentFullscreenFrame.fullscreen, true);

  const webkitFullscreenFrame = screenFrame.collect({
    document: { webkitFullscreenElement: {} },
    window: { outerWidth: 100, outerHeight: 100, innerWidth: 90, innerHeight: 90 },
    screen: { width: 100, height: 100, availWidth: 90, availHeight: 90 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(webkitFullscreenFrame.fullscreen, true);

  const mixedAvailFrame = screenFrame.collect({
    window: { outerWidth: 100, outerHeight: 100, innerWidth: 100, innerHeight: 100 },
    screen: { width: 100, height: 100 },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(mixedAvailFrame.availDeltaWidth, null);

  const suppressed = screenFrame.collect({
    window: {},
    screen: { width: 1000, height: 1000 },
    navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 2 }
  });
  assert.equal(suppressed.status, 'suppressed');

  const media = collector('display.mediaPreferences');
  assert.equal(media.collect({ window: {} }), null);
  const matches = new Set([
    '(color-gamut: p3)',
    '(forced-colors)',
    '(inverted-colors: inverted)',
    '(min-monochrome: 2)',
    '(prefers-contrast: more)',
    '(prefers-reduced-motion: reduce)',
    '(dynamic-range: high)'
  ]);
  const preferences = media.collect({
    window: {
      matchMedia(query) {
        if (query === '(prefers-reduced-transparency: reduce)') {
          throw new Error('unsupported');
        }
        return { matches: matches.has(query) };
      }
    }
  });

  assert.equal(preferences.colorGamut, 'p3');
  assert.equal(preferences.forcedColors, false);
  assert.equal(preferences.invertedColors, true);
  assert.equal(preferences.monochrome, 2);
  assert.equal(preferences.prefersReducedTransparency, null);

  const emptyPreferences = media.collect({
    window: { matchMedia: (query) => ({ matches: query === '(dynamic-range: standard)' }) }
  });
  assert.equal(emptyPreferences.colorGamut, null);
  assert.equal(emptyPreferences.forcedColors, null);
  assert.equal(emptyPreferences.monochrome, null);
  assert.equal(emptyPreferences.dynamicRange, 'standard');

  const inactivePreferences = media.collect({ window: { matchMedia: () => ({ matches: false }) } });
  assert.equal(inactivePreferences.invertedColors, null);
  assert.equal(inactivePreferences.prefersContrast, null);
  assert.equal(inactivePreferences.prefersReducedMotion, null);
  assert.equal(inactivePreferences.dynamicRange, null);

  const activeForcedColors = media.collect({
    window: { matchMedia: (query) => ({ matches: query === '(forced-colors: active)' }) }
  });
  assert.equal(activeForcedColors.forcedColors, true);
});

test('hardware, touch, architecture, and math collectors return stable values', () => {
  const hardware = collector('hardware');
  const suppressedHardware = hardware.collect({
    navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 2, deviceMemory: 8, maxTouchPoints: 1 },
    screen: { width: 1000, height: 1000 }
  });
  assert.equal(suppressedHardware.hardwareConcurrency, 4);
  assert.equal(hardware.collect({ navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 12 } }).hardwareConcurrency, 8);

  const touch = collector('hardware.touch').collect({
    global: {},
    window: {
      TouchEvent() {},
      matchMedia(query) {
        if (query === '(any-pointer: coarse)') {
          throw new Error('unsupported');
        }
        return { matches: query === '(pointer: coarse)' };
      }
    },
    navigator: { maxTouchPoints: 3 }
  });
  assert.equal(touch.touchEvent, true);
  assert.equal(touch.coarsePointer, true);
  assert.equal(touch.anyCoarsePointer, null);

  const sparseTouch = collector('hardware.touch').collect({
    global: {},
    navigator: null
  });
  assert.equal(sparseTouch.maxTouchPoints, null);
  assert.equal(sparseTouch.touchEvent, false);
  assert.equal(sparseTouch.coarsePointer, null);

  const falseTouch = collector('hardware.touch').collect({
    window: { matchMedia: () => ({ matches: false }) },
    navigator: { maxTouchPoints: Number.NaN }
  });
  assert.equal(falseTouch.maxTouchPoints, null);
  assert.equal(falseTouch.coarsePointer, false);

  const architecture = collector('hardware.architecture').collect({});
  assert.equal(typeof architecture.littleEndian, 'boolean');
  assert.match(architecture.infinityBytePattern, /^\d+-\d+-\d+-\d+$/u);

  const math = collector('math.fingerprint').collect({});
  assert.equal(typeof math.acos, 'number');
  assert.equal(typeof math.powPI, 'number');
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
  assert.equal(value.contextAttributes, null);
  assert.equal(value.unmaskedVendor, null);
  assert.equal(value.unmaskedRenderer, null);

  const withAttributes = webgl.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          VENDOR: 1,
          RENDERER: 2,
          VERSION: 3,
          SHADING_LANGUAGE_VERSION: 4,
          drawingBufferWidth: 300,
          drawingBufferHeight: 150,
          getContextAttributes: () => ({ alpha: true, antialias: false, depth: 'bad', powerPreference: 'high-performance' }),
          getExtension: () => null,
          getParameter: () => 'x'
        })
      })
    }
  });
  assert.equal(withAttributes.contextAttributes.alpha, true);
  assert.equal(withAttributes.contextAttributes.depth, null);
  assert.equal(withAttributes.contextAttributes.powerPreference, 'high-performance');
  assert.equal(withAttributes.drawingBufferWidth, 300);

  const badAttributes = webgl.collect({
    document: { createElement: () => ({ getContext: () => ({ getContextAttributes: () => null, getParameter: () => 'x' }) }) }
  });
  assert.equal(badAttributes.contextAttributes, null);

  const throwingAttributes = webgl.collect({
    document: { createElement: () => ({ getContext: () => ({ getContextAttributes: () => { throw new Error('blocked attributes'); }, getParameter: () => 'x' }) }) }
  });
  assert.equal(throwingAttributes.contextAttributes, null);

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

  const withDebugValues = webgl.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          VENDOR: 1,
          RENDERER: 2,
          VERSION: 3,
          SHADING_LANGUAGE_VERSION: 4,
          drawingBufferWidth: Number.NaN,
          getContextAttributes: () => ({ preserveDrawingBuffer: true, powerPreference: 10 }),
          getExtension: () => ({ UNMASKED_VENDOR_WEBGL: 5, UNMASKED_RENDERER_WEBGL: 6 }),
          getParameter: (parameter) => (parameter === 5 ? 'GPU Vendor' : parameter === 6 ? 'GPU Renderer' : null)
        })
      })
    }
  });
  assert.equal(withDebugValues.unmaskedVendor, 'GPU Vendor');
  assert.equal(withDebugValues.unmaskedRenderer, 'GPU Renderer');
  assert.equal(withDebugValues.contextAttributes.powerPreference, null);
});

test('WebGL extensions collector captures sorted extensions and limits', () => {
  const webgl = collector('webgl.extensions');
  assert.equal(webgl.collect({ document: null }), null);
  assert.equal(webgl.collect({ document: { createElement: () => ({}) } }), null);
  const gl = {
    MAX_TEXTURE_SIZE: 1,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 2,
    MAX_RENDERBUFFER_SIZE: 3,
    ALIASED_LINE_WIDTH_RANGE: 4,
    ALIASED_POINT_SIZE_RANGE: 5,
    MAX_VIEWPORT_DIMS: 6,
    MAX_CUBE_MAP_TEXTURE_SIZE: 7,
    MAX_VERTEX_ATTRIBS: 8,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 9,
    MAX_VARYING_VECTORS: 10,
    getSupportedExtensions: () => ['Z_EXT', 'WEBGL_debug_shaders', 'A_EXT'],
    getParameter(parameter) {
      if (parameter === 4) {
        return new Float32Array([1, 4]);
      }
      if (parameter === 5) {
        return [2, Number.NaN];
      }
      if (parameter === 6) {
        return new Int32Array([1024, 768]);
      }
      return parameter * 10;
    }
  };

  const value = webgl.collect({
    document: {
      createElement: () => ({ getContext: () => gl })
    }
  });

  assert.deepEqual(value.extensions, ['A_EXT', 'Z_EXT']);
  assert.deepEqual(value.omittedExtensions, ['WEBGL_debug_shaders']);
  assert.equal(value.maxTextureSize, 10);
  assert.equal(value.maxCubeMapTextureSize, 70);
  assert.deepEqual(value.maxViewportDims, [1024, 768]);
  assert.deepEqual(value.aliasedLineWidthRange, [1, 4]);
  assert.deepEqual(value.aliasedPointSizeRange, [2, null]);

  const sparse = webgl.collect({
    document: {
      createElement: () => ({ getContext: () => ({ getSupportedExtensions: () => 'bad', getParameter: () => ({}) }) })
    }
  });
  assert.deepEqual(sparse.extensions, []);
  assert.equal(sparse.aliasedLineWidthRange, null);

  const noExtensionApi = webgl.collect({
    document: {
      createElement: () => ({ getContext: () => ({ getParameter: () => 0 }) })
    }
  });
  assert.deepEqual(noExtensionApi.extensions, []);
});

test('WebGL precision collector captures shader precision formats', () => {
  const precision = collector('webgl.precision');
  assert.equal(precision.collect({ document: null }), null);
  assert.equal(precision.collect({ document: { createElement: () => ({ getContext: () => ({}) }) } }), null);

  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    HIGH_FLOAT: 3,
    MEDIUM_FLOAT: 4,
    getShaderPrecisionFormat(shaderType, precisionType) {
      if (shaderType === 2 && precisionType === 3) {
        throw new Error('blocked');
      }
      if (shaderType === 1 && precisionType === 4) {
        return null;
      }
      return { precision: shaderType + precisionType, rangeMin: Number.NaN, rangeMax: 127 };
    }
  };

  const value = precision.collect({
    document: { createElement: () => ({ getContext: () => gl }) }
  });

  assert.equal(value.vertexHighFloat.precision, 4);
  assert.equal(value.vertexHighFloat.rangeMin, null);
  assert.equal(value.fragmentHighFloat, null);
  assert.equal(value.vertexMediumFloat, null);
  assert.equal(value.fragmentMediumFloat.rangeMax, 127);
});

test('canvas collector handles unavailable and available canvas paths', () => {
  const canvas = collector('canvas.checksum');

  assert.equal(canvas.collect({ document: null }), null);
  assert.equal(canvas.collect({ document: {} }), null);
  assert.equal(canvas.collect({ document: { createElement: () => ({}) } }), null);
  assert.equal(canvas.collect({ document: { createElement: () => ({ getContext: () => null }) } }), null);
  assert.equal(canvas.collect({ document: { createElement: () => ({ getContext: () => ({}) }) } }), null);
  assert.equal(canvas.collect({
    document: { createElement: () => ({ getContext: () => ({}) }) },
    navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 2 },
    screen: { width: 1000, height: 1000 }
  }).status, 'suppressed');
  assert.equal(canvas.collect({
    document: { createElement: () => ({ getContext: () => ({}) }) },
    navigator: { userAgent: 'Version/17.0 Safari/605.1.15', platform: 'MacIntel' }
  }).reason, 'safari_17_unstable_source');

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
    },
    rect(...args) {
      operations.push(['rect', ...args]);
    },
    isPointInPath() {
      return false;
    }
  };
  const fakeCanvas = {
    getContext: (type) => (type === '2d' ? context : null),
    toDataURL: () => `data:image/png;base64,${operations.length}`
  };

  const value = canvas.collect({
    document: { createElement: () => fakeCanvas }
  });

  assert.equal(value.status, 'ok');
  assert.equal(value.winding, true);
  assert.ok(value.geometry.length > 'data:image/png;base64,'.length);
  assert.equal(value.geometry.status, 'ok');
  assert.match(value.text.checksum, /^[a-f0-9]{16}$/u);

  const readFailure = canvas.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          set fillStyle(_value) {},
          set globalCompositeOperation(_value) {},
          set textBaseline(_value) {},
          set font(_value) {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          fillText() {},
          rect() {},
          isPointInPath: () => true
        }),
        toDataURL: () => { throw new Error('blocked canvas'); }
      })
    }
  });
  assert.equal(readFailure.geometry.status, 'unstable');

  const readFailureWithoutMessage = canvas.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          set fillStyle(_value) {},
          set globalCompositeOperation(_value) {},
          set textBaseline(_value) {},
          set font(_value) {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          fillText() {}
        }),
        toDataURL: () => { throw 'blocked'; }
      })
    }
  });
  assert.equal(readFailureWithoutMessage.geometry.reason, 'canvas_read_failed');

  let noisyRead = 0;
  const noisyText = canvas.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          set fillStyle(_value) {},
          set globalCompositeOperation(_value) {},
          set textBaseline(_value) {},
          set font(_value) {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          fillText() {},
          rect() {},
          isPointInPath: () => true
        }),
        toDataURL: () => `data-${noisyRead += 1}`
      })
    }
  });
  assert.equal(noisyText.text.reason, 'canvas_noise_detected');

  const noWinding = canvas.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          set fillStyle(_value) {},
          set globalCompositeOperation(_value) {},
          set textBaseline(_value) {},
          set font(_value) {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          fillText() {}
        }),
        toDataURL: () => 'data'
      })
    }
  });
  assert.equal(noWinding.winding, null);

  const halfWinding = canvas.collect({
    document: {
      createElement: () => ({
        getContext: () => ({
          set fillStyle(_value) {},
          set globalCompositeOperation(_value) {},
          set textBaseline(_value) {},
          set font(_value) {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          fillText() {},
          rect() {}
        }),
        toDataURL: () => 'data'
      })
    }
  });
  assert.equal(halfWinding.winding, null);
});

test('font collectors use font API and layout fallback', () => {
  const fonts = collector('fonts.available');
  assert.equal(fonts.collect({ document: null }), null);
  assert.equal(fonts.collect({ document: {} }), null);
  assert.equal(fonts.collect({}, { method: 'prepared-fonts' }).method, 'prepared-fonts');

  const checked = fonts.collect({
    document: {
      fonts: {
        check: (query) => query.includes('Arial') || query.includes('Menlo')
      }
    }
  });
  assert.equal(checked.method, 'font-check');
  assert.ok(checked.available.includes('Arial'));

  const layoutDocument = createFakeDocument();
  const measured = fonts.collect({ document: layoutDocument });
  assert.equal(measured.method, 'layout');
  assert.equal(measured.checked > 0, true);

  const preferences = collector('fonts.preferences');
  assert.equal(preferences.collect({ document: {} }), null);
  const preferenceValues = preferences.collect({ document: createFakeDocument() });
  assert.equal(typeof preferenceValues.monospace.width, 'number');

  const framed = fonts.collect({ document: createFakeDocument({ iframeDocument: createFakeDocument() }) });
  assert.equal(framed.method, 'layout');

  const framedWindow = fonts.collect({ document: createFakeDocument({ iframeWindowDocument: createFakeDocument() }) });
  assert.equal(framedWindow.method, 'layout');

  const noFrameDocument = createFakeDocument({ frameMode: 'none' });
  assert.equal(fonts.collect({ document: noFrameDocument }).method, 'layout');

  const noStyleFrameDocument = createFakeDocument({ frameMode: 'no-style' });
  assert.equal(fonts.collect({ document: noStyleFrameDocument }).method, 'layout');

  const throwingFrameDocument = createFakeDocument({ frameMode: 'throw' });
  assert.equal(fonts.collect({ document: throwingFrameDocument }).method, 'layout');

  const preparedFonts = fonts.prepare({ document: layoutDocument });
  assert.equal(preparedFonts.method, 'layout');

  const preparedPreferences = preferences.prepare({ document: createFakeDocument() });
  assert.equal(preferences.collect({}, preparedPreferences), preparedPreferences);
  const scaledPreferences = preferences.collect({ document: createFakeDocument(), global: { devicePixelRatio: 2 } });
  assert.equal(scaledPreferences.devicePixelRatio, 2);
  assert.equal(typeof scaledPreferences.presets.math.serif, 'number');
  const invalidRatioPreferences = preferences.collect({ document: createFakeDocument(), global: { devicePixelRatio: -1 } });
  assert.equal(invalidRatioPreferences.devicePixelRatio, 1);
  const nullBoxPreferences = preferences.collect({ document: createFakeDocument({ sparseBoxes: true }) });
  assert.equal(nullBoxPreferences.monospace.width, null);
  assert.equal(nullBoxPreferences.presets.defaultText.serif, null);
});

test('audio collectors handle unsupported, suppressed, latency, promise, and event rendering paths', async () => {
  const audio = collector('audio.fingerprint');
  const latency = collector('audio.baseLatency');

  assert.equal((await audio.collect({ window: {}, navigator: {} })).status, 'unsupported');
  assert.equal(latency.collect({ window: {}, navigator: {} }).status, 'unsupported');
  assert.equal((await audio.collect({
    window: {},
    navigator: { userAgent: 'Version/17.0 Safari/605.1.15', platform: 'MacIntel' }
  })).status, 'suppressed');
  assert.equal(latency.collect({
    window: {},
    navigator: { userAgent: 'SamsungBrowser/26.0 Chrome/120.0 Safari/537.36' }
  }).status, 'suppressed');
  assert.equal((await audio.collect({
    window: {},
    navigator: { userAgent: 'Firefox/143.0', hardwareConcurrency: 2 },
    screen: { width: 1000, height: 1000 }
  })).status, 'suppressed');

  const latencyValue = latency.collect({
    window: { AudioContext: createFakeAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(latencyValue.status, 'ok');
  assert.equal(latencyValue.baseLatency, 0.01);

  const webkitLatency = latency.collect({
    window: { webkitAudioContext: createFakeAudioContext({ close: false }) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(webkitLatency.sampleRate, 48000);

  const sparseLatency = latency.collect({
    window: { AudioContext: createFakeAudioContext({ sparse: true }) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(sparseLatency.baseLatency, null);
  assert.equal(sparseLatency.state, null);

  const latencyError = latency.collect({
    window: { AudioContext: class { constructor() { throw new Error('blocked audio'); } } },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(latencyError.status, 'error');

  const latencyErrorWithoutMessage = latency.collect({
    window: { AudioContext: class { constructor() { throw 'blocked'; } } },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(latencyErrorWithoutMessage.message, 'audio_context_error');

  const promiseValue = await audio.collect({
    window: { OfflineAudioContext: createFakeOfflineAudioContext(true, true) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(promiseValue.status, 'ok');
  assert.match(promiseValue.checksum, /^[a-f0-9]{16}$/u);
  assert.equal((await audio.prepare({
    window: { OfflineAudioContext: createFakeOfflineAudioContext(true, true) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  })).status, 'ok');
  assert.equal((await audio.collect({}, { status: 'ok', checksum: 'prepared' })).checksum, 'prepared');

  const eventValue = await audio.collect({
    window: { OfflineAudioContext: createFakeOfflineAudioContext(false, false) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(eventValue.status, 'ok');

  const eventWithoutPayload = await audio.collect({
    window: { OfflineAudioContext: createEventWithoutPayloadOfflineAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 0
  });
  assert.equal(eventWithoutPayload.sampleRate, 44100);

  const sparseRendered = await audio.collect({
    window: { webkitOfflineAudioContext: createSparseOfflineAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(sparseRendered.status, 'ok');
  assert.equal(sparseRendered.sampleRate, 44100);
  assert.equal(sparseRendered.length, 4096);

  const noCompressor = await audio.collect({
    window: { OfflineAudioContext: createNoCompressorOfflineAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(noCompressor.status, 'ok');

  const retryValue = await audio.collect({
    window: { OfflineAudioContext: createRetryOfflineAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 0
  });
  assert.equal(retryValue.renderAttempts, 2);

  const renderError = await audio.collect({
    window: { OfflineAudioContext: createRejectingOfflineAudioContext('render failed') },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 0
  });
  assert.equal(renderError.status, 'error');

  const eventError = await audio.collect({
    window: { OfflineAudioContext: createEventErrorOfflineAudioContext() },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 0
  });
  assert.equal(eventError.status, 'error');

  const renderTimeout = await audio.collect({
    window: { OfflineAudioContext: createHangingOfflineAudioContext('running') },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 1
  });
  assert.equal(renderTimeout.status, 'timeout');

  const suspendedTimeout = await audio.collect({
    window: { OfflineAudioContext: createHangingOfflineAudioContext('suspended') },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 1
  });
  assert.equal(suspendedTimeout.status, 'suspended');

  const windowTimerCalls = [];
  const runtimeTimerValue = await audio.collect({
    window: {
      OfflineAudioContext: createFakeOfflineAudioContext(true, true),
      setTimeout(callback, timeoutMs) {
        windowTimerCalls.push(timeoutMs);
        return globalThis.setTimeout(callback, timeoutMs);
      },
      clearTimeout(timeoutId) {
        windowTimerCalls.push('clear');
        return globalThis.clearTimeout(timeoutId);
      }
    },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 5
  });
  assert.equal(runtimeTimerValue.status, 'ok');
  assert.ok(windowTimerCalls.includes('clear'));

  const partialTimerValue = await audio.collect({
    window: {
      OfflineAudioContext: createFakeOfflineAudioContext(true, true),
      setTimeout(callback, timeoutMs) {
        return globalThis.setTimeout(callback, timeoutMs);
      }
    },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 5
  });
  assert.equal(partialTimerValue.status, 'ok');

  const partialClearTimerValue = await audio.collect({
    window: {
      OfflineAudioContext: createFakeOfflineAudioContext(true, true),
      clearTimeout(timeoutId) {
        return globalThis.clearTimeout(timeoutId);
      }
    },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 5
  });
  assert.equal(partialClearTimerValue.status, 'ok');

  const timerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'setTimeout');
  const clearTimerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'clearTimeout');
  try {
    Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, value: undefined });
    const noTimerValue = await audio.collect({
      window: { OfflineAudioContext: createFakeOfflineAudioContext(true, true) },
      navigator: { userAgent: 'Chrome/120 Safari/537.36' },
      audioRenderTimeoutMs: 5
    });
    assert.equal(noTimerValue.status, 'ok');
  } finally {
    restoreGlobalProperty('setTimeout', timerDescriptor);
    restoreGlobalProperty('clearTimeout', clearTimerDescriptor);
  }

  const nonErrorRejection = await audio.collect({
    window: { OfflineAudioContext: createRejectingOfflineAudioContext(null) },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' },
    audioRenderTimeoutMs: 0
  });
  assert.equal(nonErrorRejection.message, 'audio_render_failed');

  const unsupported = await audio.collect({
    window: { OfflineAudioContext: class { startRendering() {} } },
    navigator: { userAgent: 'Chrome/120 Safari/537.36' }
  });
  assert.equal(unsupported.status, 'unsupported');
});

test('browser feature collectors cover plugins, vendor flavors, payment, private click, and blockers', () => {
  const api = collector('browser.apiFeatures').collect({
    window: { Promise, fetch() {}, localStorage: {}, performance: {} },
    navigator: { clipboard: {}, permissions: {} }
  });
  assert.equal(api.javascript.Promise, true);
  assert.equal(api.javascript.Proxy, false);
  assert.equal(api.browser.fetch, true);
  assert.equal(api.storage.localStorage, true);
  assert.equal(api.navigator.clipboard, true);
  assert.equal(collector('browser.apiFeatures').collect({ window: new Proxy({}, { has() { throw new Error('blocked'); } }), navigator: null }).browser.fetch, false);

  const css = collector('browser.cssFeatures');
  assert.equal(css.collect({ window: {} }), null);
  assert.equal(css.collect({ window: { CSS: {} } }), null);
  const cssValue = css.collect({
    window: {
      CSS: {
        supports(property) {
          if (property === 'anchor-name') {
            throw new Error('unsupported');
          }
          return property === 'accent-color';
        }
      }
    }
  });
  assert.equal(cssValue.accentColor, true);
  assert.equal(cssValue.containerQueries, false);
  assert.equal(cssValue.anchorPositioning, null);

  const connection = collector('network.connection');
  assert.equal(connection.collect({ navigator: {} }), null);
  assert.equal(connection.collect({ navigator: null }), null);
  assert.equal(connection.collect({ navigator: { connection: { type: 'wifi', saveData: true } } }).type, 'wifi');
  const connectionValue = connection.collect({ navigator: { mozConnection: { effectiveType: '4g', downlink: 10, rtt: Number.NaN, saveData: false } } });
  assert.equal(connectionValue.effectiveType, '4g');
  assert.equal(connectionValue.type, null);
  assert.equal(connectionValue.rtt, null);
  assert.equal(connectionValue.saveData, false);
  assert.equal(connection.collect({ navigator: { webkitConnection: { rtt: 20 } } }).rtt, 20);

  const performanceMemory = collector('performance.memory');
  assert.equal(performanceMemory.collect({ window: {} }), null);
  assert.equal(performanceMemory.collect({ window: { performance: {} } }), null);
  const memoryValue = performanceMemory.collect({ window: { performance: { memory: { jsHeapSizeLimit: 64 * 1024 * 1024, totalJSHeapSize: Number.NaN, usedJSHeapSize: 3 * 1024 * 1024 } } } });
  assert.equal(memoryValue.jsHeapSizeLimitMB, 64);
  assert.equal(memoryValue.totalJSHeapSizeMB, null);
  assert.equal(memoryValue.usedJSHeapSizeMB, 3);

  assert.equal(collector('browser.plugins').collect({ navigator: {} }), null);
  assert.deepEqual(collector('browser.plugins').collect({ navigator: { plugins: { length: Number.NaN } } }), []);
  const plugins = collector('browser.plugins').collect({
    navigator: {
      plugins: {
        length: 2,
        0: {
          name: 'Z PDF',
          description: 'Reader',
          filename: 'pdf.dll',
          length: 1,
          0: { type: 'application/pdf', suffixes: 'pdf' }
        },
        1: {
          name: 'A Media',
          description: 'Media',
          filename: 'media.dll',
          length: 0
        }
      }
    }
  });
  assert.equal(plugins[1].mimeTypes[0].type, 'application/pdf');
  const sparsePlugin = collector('browser.plugins').collect({
    navigator: { plugins: { length: 1, 0: { length: 1, 0: {} } } }
  });
  assert.equal(sparsePlugin[0].name, null);
  assert.equal(sparsePlugin[0].mimeTypes[0].suffixes, null);

  const flavors = collector('browser.vendorFlavors').collect({ window: { chrome: {}, safari: {}, __crWeb: true } });
  assert.deepEqual(flavors, ['chrome', 'chromeIos', 'safari']);

  assert.equal(collector('browser.pdfViewer').collect({ navigator: { pdfViewerEnabled: true } }), true);
  assert.equal(collector('browser.pdfViewer').collect({ navigator: {} }), null);

  const applePay = collector('browser.applePay');
  assert.equal(applePay.collect({ window: {} }).status, 'no_api');
  assert.equal(applePay.collect({ window: { ApplePaySession: {} } }).status, 'no_api');
  assert.equal(applePay.collect({ window: { isSecureContext: false, ApplePaySession: { canMakePayments: () => true } } }).status, 'insecure_context');
  assert.equal(applePay.collect({ window: { ApplePaySession: { canMakePayments: () => true } } }).status, 'enabled');
  assert.equal(applePay.collect({ window: { ApplePaySession: { canMakePayments: () => false } } }).status, 'disabled');
  assert.equal(applePay.collect({ window: { ApplePaySession: { canMakePayments: () => { throw new Error('blocked'); } } } }).status, 'error');
  assert.equal(applePay.collect({ window: { ApplePaySession: { canMakePayments: () => { throw 'blocked'; } } } }).message, 'apple_pay_error');

  const privateClick = collector('browser.privateClickMeasurement');
  assert.equal(privateClick.collect({ document: null }), null);
  assert.equal(privateClick.collect({ document: {} }), null);
  assert.equal(privateClick.collect({ document: { createElement: () => ({ attributionSourceId: 3 }) } }), '3');
  assert.equal(privateClick.collect({ document: { createElement: () => ({ attributionsourceid: 7 }) } }), '7');
  assert.equal(privateClick.collect({ document: { createElement: () => ({}) } }), null);

  const blockers = collector('browser.domBlockers');
  assert.equal(blockers.collect({ document: null }), null);
  assert.equal(blockers.collect({ document: { body: null, createElement: () => ({}) } }), null);
  assert.equal(blockers.collect({ document: { body: {}, createElement: null } }), null);
  const blockedDocument = createFakeDocument({ hiddenClass: 'adsbox' });
  const blocked = blockers.collect({
    document: blockedDocument,
    window: { getComputedStyle: (element) => ({ display: element.className.includes('tracking') ? 'none' : 'block', visibility: 'visible', opacity: '1' }) }
  });
  assert.equal(blocked.checked, 15);
  assert.ok(blocked.blocked.includes('generic-ad'));
  assert.ok(blocked.blocked.includes('analytics'));
  assert.equal(typeof blocked.checksum, 'string');

  const visible = blockers.collect({ document: createFakeDocument(), window: {} });
  assert.deepEqual(visible.blocked, []);

  const opacityBlocked = blockers.collect({
    document: createFakeDocument(),
    window: { getComputedStyle: (element) => ({ display: 'block', visibility: element.className.includes('sponsor') ? 'hidden' : 'visible', opacity: element.className.includes('tracking') ? '0' : '1' }) }
  });
  assert.ok(opacityBlocked.blocked.includes('sponsor'));
  assert.ok(opacityBlocked.blocked.includes('analytics'));

  const noParentDocument = createFakeDocument();
  noParentDocument.body.appendChild = () => null;
  const noParent = blockers.collect({ document: noParentDocument, window: {} });
  assert.equal(noParent.checked, 15);

  const zeroBox = blockers.collect({ document: createFakeDocument({ zeroHeightClass: 'sponsor', zeroWidthClass: 'tracking' }), window: {} });
  assert.ok(zeroBox.blocked.includes('sponsor'));
  assert.ok(zeroBox.blocked.includes('analytics'));
});

function createFakeDocument(options = {}) {
  const hiddenClass = options.hiddenClass || '';
  const zeroHeightClass = options.zeroHeightClass || '';
  const zeroWidthClass = options.zeroWidthClass || '';
  const sparseBoxes = Boolean(options.sparseBoxes);
  const iframeDocument = options.iframeDocument || null;
  const iframeWindowDocument = options.iframeWindowDocument || null;
  const frameMode = options.frameMode || 'normal';
  const documentRef = {
    body: createFakeElement('body', hiddenClass, zeroHeightClass, zeroWidthClass, sparseBoxes),
    createElement(tagName) {
      if (tagName === 'iframe' && frameMode === 'none') {
        return null;
      }

      if (tagName === 'iframe' && frameMode === 'throw') {
        throw new Error('iframe blocked');
      }

      if (tagName === 'iframe' && frameMode === 'no-style') {
        return { tagName };
      }

      if (tagName === 'iframe' && iframeDocument) {
        return {
          tagName,
          style: {},
          parentNode: null,
          contentDocument: iframeDocument,
          setAttribute() {}
        };
      }

      if (tagName === 'iframe' && iframeWindowDocument) {
        return {
          tagName,
          style: {},
          parentNode: null,
          contentWindow: { document: iframeWindowDocument },
          setAttribute() {}
        };
      }

      return createFakeElement(tagName, hiddenClass, zeroHeightClass, zeroWidthClass, sparseBoxes);
    }
  };

  return documentRef;
}

function createFakeElement(tagName, hiddenClass, zeroHeightClass, zeroWidthClass, sparseBoxes = false) {
  return {
    tagName,
    children: [],
    className: '',
    textContent: '',
    style: {},
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      child.parentNode = null;
      return child;
    },
    get offsetParent() {
      return this.className.includes(hiddenClass) && hiddenClass ? null : {};
    },
    get offsetWidth() {
      if (sparseBoxes && tagName === 'span') {
        return Number.NaN;
      }
      if (this.className.includes(hiddenClass) && hiddenClass) {
        return 0;
      }
      if (this.className.includes(zeroWidthClass) && zeroWidthClass) {
        return 0;
      }
      const fontFamily = this.style.fontFamily || '';
      return fontFamily.includes('Arial') || fontFamily.includes('Menlo') ? 120 : 100;
    },
    get offsetHeight() {
      if (sparseBoxes && tagName === 'span') {
        return Number.NaN;
      }
      if (this.className.includes(hiddenClass) && hiddenClass) {
        return 0;
      }
      if (this.className.includes(zeroHeightClass) && zeroHeightClass) {
        return 0;
      }
      const fontFamily = this.style.fontFamily || '';
      return fontFamily.includes('Arial') || fontFamily.includes('Menlo') ? 28 : 24;
    }
  };
}

function createFakeOfflineAudioContext(returnsPromise, withCompressor) {
  return class FakeOfflineAudioContext {
    constructor(_channels, length, sampleRate) {
      this.length = length;
      this.sampleRate = sampleRate;
      this.currentTime = 0;
      this.destination = {};
    }

    createOscillator() {
      return {
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {}
      };
    }

    createDynamicsCompressor() {
      if (!withCompressor) {
        return null;
      }
      return {
        threshold: { setValueAtTime() {} },
        knee: { setValueAtTime() {} },
        ratio: { setValueAtTime() {} },
        attack: { setValueAtTime() {} },
        release: { setValueAtTime() {} },
        connect() {}
      };
    }

    startRendering() {
      const buffer = {
        sampleRate: this.sampleRate,
        length: this.length,
        getChannelData: () => new Float32Array([0.1, 0.2, 0.3, 0.4])
      };

      if (returnsPromise) {
        return Promise.resolve(buffer);
      }

      queueMicrotask(() => this.oncomplete({ renderedBuffer: buffer }));
      return undefined;
    }
  };
}

function createFakeAudioContext(options = {}) {
  class FakeAudioContext {
    constructor() {
      this.baseLatency = options.sparse ? Number.NaN : 0.01;
      this.outputLatency = options.sparse ? undefined : 0.02;
      this.sampleRate = options.sparse ? undefined : 48000;
      this.state = options.sparse ? {} : 'running';
    }

    close() {
      return Promise.resolve();
    }
  }

  if (options.close === false) {
    delete FakeAudioContext.prototype.close;
  }

  return FakeAudioContext;
}

function createFakeStorage() {
  const values = new Map();
  return {
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function createThrowingStorage() {
  return {
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {}
  };
}

function createFakeIndexedDb(mode) {
  const api = {
    open() {
      const request = {};
      queueMicrotask(() => {
        if (mode === 'success' || mode === 'success-no-cleanup' || mode === 'success-null-result') {
          request.result = mode === 'success' ? { close() {} } : mode === 'success-no-cleanup' ? {} : null;
          request.onsuccess && request.onsuccess();
          if (mode === 'success') {
            request.onsuccess && request.onsuccess();
          }
        } else if (mode === 'blocked') {
          request.onblocked && request.onblocked();
        } else {
          request.onerror && request.onerror();
        }
      });
      return request;
    },
    deleteDatabase() {}
  };

  if (mode === 'success-no-cleanup') {
    delete api.deleteDatabase;
  }

  return api;
}

function createSparseOfflineAudioContext() {
  return class SparseOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }

    createOscillator() {
      return {
        connect() {},
        start() {}
      };
    }

    createDynamicsCompressor() {
      return {
        connect() {}
      };
    }

    startRendering() {
      return Promise.resolve({});
    }
  };
}

function createNoCompressorOfflineAudioContext() {
  return class NoCompressorOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }

    createOscillator() {
      return {
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {}
      };
    }

    startRendering() {
      return Promise.resolve({
        sampleRate: 22050,
        length: 2,
        getChannelData: () => new Float32Array([0, 1])
      });
    }
  };
}

function createRetryOfflineAudioContext() {
  return class RetryOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'suspended';
      this.attempts = 0;
    }

    createOscillator() {
      return {
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {}
      };
    }

    createDynamicsCompressor() {
      return {
        threshold: { setValueAtTime() {} },
        knee: { setValueAtTime() {} },
        ratio: { setValueAtTime() {} },
        attack: { setValueAtTime() {} },
        release: { setValueAtTime() {} },
        connect() {}
      };
    }

    startRendering() {
      this.attempts += 1;
      if (this.attempts === 1) {
        return Promise.reject(new Error('audio suspended'));
      }

      this.state = 'running';
      return Promise.resolve({
        sampleRate: 44100,
        length: 4,
        getChannelData: () => new Float32Array([0.1, 0.2])
      });
    }
  };
}

function createRejectingOfflineAudioContext(message) {
  return class RejectingOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }

    createOscillator() {
      return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }

    createDynamicsCompressor() {
      return null;
    }

    startRendering() {
      return Promise.reject(message === null ? null : new Error(message));
    }
  };
}

function createEventErrorOfflineAudioContext() {
  return class EventErrorOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }

    createOscillator() {
      return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }

    createDynamicsCompressor() {
      return null;
    }

    startRendering() {
      queueMicrotask(() => this.onerror(new Error('event render failed')));
      return undefined;
    }
  };
}

function createEventWithoutPayloadOfflineAudioContext() {
  return class EventWithoutPayloadOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }

    createOscillator() {
      return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }

    createDynamicsCompressor() {
      return null;
    }

    startRendering() {
      queueMicrotask(() => this.oncomplete(null));
      return undefined;
    }
  };
}

function createHangingOfflineAudioContext(state) {
  return class HangingOfflineAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = state;
    }

    createOscillator() {
      return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }

    createDynamicsCompressor() {
      return null;
    }

    startRendering() {
      return new Promise(() => {});
    }
  };
}

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}
