/* FingerprintJS by BotBlocker v0.1.0 | MIT | https://botblocker.top */
"use strict";
var FingerprintJSBotBlocker = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    PROFILE_PRESETS: () => PROFILE_PRESETS,
    USE_CASE_PRESETS: () => USE_CASE_PRESETS,
    VERSION: () => VERSION,
    canonicalStringify: () => canonicalStringify,
    componentsToDebugString: () => componentsToDebugString,
    createApiFeaturesCollector: () => createApiFeaturesCollector,
    createBotDetectionCollector: () => createBotDetectionCollector,
    createBrowserCollectorPack: () => createBrowserCollectorPack,
    createClient: () => createClient,
    createCollector: () => createCollector,
    createCssFeaturesCollector: () => createCssFeaturesCollector,
    createDefaultCollectors: () => createDefaultCollectors,
    createExplainableReport: () => createExplainableReport,
    createNetworkConnectionCollector: () => createNetworkConnectionCollector,
    createPerformanceMemoryCollector: () => createPerformanceMemoryCollector,
    createPolicy: () => createPolicy,
    createPrivacyModeCollector: () => createPrivacyModeCollector,
    createStabilityMonitor: () => createStabilityMonitor,
    createTamperEvidenceCollector: () => createTamperEvidenceCollector,
    createUseCasePreset: () => createUseCasePreset,
    createWebglPrecisionCollector: () => createWebglPrecisionCollector,
    diffComponents: () => diffComponents,
    explainComponent: () => explainComponent,
    hashComponents: () => hashComponents,
    hashValue: () => hashValue,
    listUseCasePresets: () => listUseCasePresets,
    loadClient: () => loadClient
  });

  // src/canonical.js
  function canonicalStringify(value) {
    return JSON.stringify(toCanonical(value));
  }
  function toCanonical(value) {
    if (value === null) {
      return null;
    }
    const valueType = typeof value;
    if (valueType === "string" || valueType === "boolean") {
      return value;
    }
    if (valueType === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (valueType === "bigint") {
      return value.toString();
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => toCanonical(item));
    }
    if (valueType === "undefined" || valueType === "function" || valueType === "symbol") {
      return void 0;
    }
    if (valueType === "object") {
      const output = {};
      const keys = Object.keys(value).sort();
      for (const key of keys) {
        const normalized = toCanonical(value[key]);
        if (typeof normalized !== "undefined") {
          output[key] = normalized;
        }
      }
      return output;
    }
  }

  // src/constants.js
  var VERSION = "0.1.0";
  var SCHEMA_VERSION = "bbid-v2";
  var DEFAULT_COLLECTOR_TIMEOUT_MS = 700;
  var DEFAULT_LOAD_DELAY_MS = 50;
  var SENSITIVITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });
  var PROFILE_PRESETS = Object.freeze({
    strict: Object.freeze({
      maxSensitivity: "low",
      includeActive: false,
      includeUnstable: false
    }),
    balanced: Object.freeze({
      maxSensitivity: "medium",
      includeActive: false,
      includeUnstable: false
    }),
    extended: Object.freeze({
      maxSensitivity: "high",
      includeActive: true,
      includeUnstable: true
    })
  });

  // src/collectors/core.js
  function createCollector(definition) {
    if (!definition || typeof definition !== "object") {
      throw new TypeError("Collector definition must be an object.");
    }
    if (!definition.id || typeof definition.id !== "string") {
      throw new TypeError("Collector id must be a non-empty string.");
    }
    if (typeof definition.collect !== "function") {
      throw new TypeError(`Collector ${definition.id} must provide collect(context).`);
    }
    if (definition.prepare != null && typeof definition.prepare !== "function") {
      throw new TypeError(`Collector ${definition.id} prepare must be a function when provided.`);
    }
    const sensitivity = definition.sensitivity || "low";
    if (!SENSITIVITY_RANK[sensitivity]) {
      throw new TypeError(`Collector ${definition.id} has unknown sensitivity: ${sensitivity}`);
    }
    return Object.freeze({
      id: definition.id,
      version: String(definition.version || "1"),
      category: String(definition.category || "custom"),
      sensitivity,
      mode: definition.mode === "active" ? "active" : "passive",
      stability: definition.stability || "stable",
      weight: Number.isFinite(definition.weight) ? Math.max(0, Number(definition.weight)) : 1,
      hashable: typeof definition.hashable === "boolean" ? definition.hashable : typeof definition.includeInIdentity === "boolean" ? definition.includeInIdentity : true,
      prepare: definition.prepare || null,
      collect: definition.collect
    });
  }

  // src/collectors/shared.js
  function checksumString(text) {
    let first = 3735928559;
    let second = 1103547991;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 2654435761);
      second = Math.imul(second ^ code, 1597334677);
    }
    first = Math.imul(first ^ first >>> 16, 2246822507) ^ Math.imul(second ^ second >>> 13, 3266489909);
    second = Math.imul(second ^ second >>> 16, 2246822507) ^ Math.imul(first ^ first >>> 13, 3266489909);
    return `${(second >>> 0).toString(16).padStart(8, "0")}${(first >>> 0).toString(16).padStart(8, "0")}`;
  }
  function normalizeBrands(brands) {
    if (!Array.isArray(brands)) {
      return [];
    }
    return brands.map((brand) => ({ brand: brand && brand.brand ? brand.brand : null, version: brand && brand.version ? brand.version : null })).sort((left, right) => String(left.brand).localeCompare(String(right.brand)));
  }
  function safeBoolean(value) {
    return typeof value === "boolean" ? value : null;
  }
  function safeNumber(value) {
    return Number.isFinite(value) ? Number(value) : null;
  }
  function safeString(value) {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
  function toArrayLike(value) {
    if (!value || !Number.isFinite(value.length)) {
      return [];
    }
    return Array.from({ length: Number(value.length) }, (_item, index) => value[index]).filter(Boolean);
  }
  function getWindowRef(context) {
    return context.window || context.global || {};
  }
  function getMatchMedia(context) {
    const windowRef = getWindowRef(context);
    return typeof windowRef.matchMedia === "function" ? windowRef.matchMedia.bind(windowRef) : null;
  }

  // src/collectors/bot-detection.js
  var AUTOMATION_GLOBALS = Object.freeze([
    "__driver_evaluate",
    "__driver_unwrapped",
    "__fxdriver_evaluate",
    "__fxdriver_unwrapped",
    "__nightmare",
    "__playwright__binding__",
    "__pwInitScripts",
    "__selenium_evaluate",
    "__selenium_unwrapped",
    "__webdriver_evaluate",
    "__webdriver_script_fn",
    "__webdriver_script_func",
    "__webdriver_script_function",
    "__webdriver_unwrapped",
    "_phantom",
    "_Selenium_IDE_Recorder",
    "callPhantom",
    "calledSelenium",
    "callSelenium",
    "domAutomation",
    "domAutomationController",
    "phantom"
  ]);
  var HEADLESS_UA_PATTERN = /HeadlessChrome|PhantomJS|SlimerJS|puppeteer|playwright/u;
  function createBotDetectionCollector() {
    return createCollector({
      id: "browser.botDetection",
      version: "1",
      category: "automation",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 0.95,
      hashable: false,
      collect(context) {
        const navigatorRef = context.navigator;
        const windowRef = getWindowRef(context);
        const userAgent = safeString(navigatorRef && navigatorRef.userAgent) || "";
        const plugins = navigatorRef ? toArrayLike(navigatorRef.plugins) : [];
        const mimeTypes = navigatorRef ? toArrayLike(navigatorRef.mimeTypes) : [];
        const languages = normalizeLanguages(navigatorRef && navigatorRef.languages);
        const language = safeString(navigatorRef && navigatorRef.language) || "";
        const automationGlobals = AUTOMATION_GLOBALS.filter((property) => property in windowRef).sort();
        const languageIssues = detectLanguageIssues(language, languages);
        const hardwareIssues = detectHardwareIssues(navigatorRef || {});
        const checks = [
          createCheck("navigator.webdriver", navigatorRef && navigatorRef.webdriver === true, 0.45, null),
          createCheck("automation.globals", automationGlobals.length > 0, 0.35, automationGlobals),
          createCheck("headless.userAgent", HEADLESS_UA_PATTERN.test(userAgent), 0.3, userAgent || null),
          createCheck("empty.languages", Boolean(navigatorRef && language && languages.length === 0), 0.1, null),
          createCheck("language.mismatch", languageIssues.length > 0, 0.08, languageIssues),
          createCheck("impossible.hardware", hardwareIssues.length > 0, 0.08, hardwareIssues),
          createCheck("zero.outer.window", hasZeroOuterWindow(windowRef), 0.12, readWindowSize(windowRef)),
          createCheck("empty.chrome.plugins", isChromeLike(userAgent) && plugins.length === 0 && mimeTypes.length === 0, 0.08, null),
          createCheck("plugin.inconsistency", hasPluginInconsistency(plugins, mimeTypes), 0.08, summarizePlugins(plugins, mimeTypes)),
          createCheck("permissions.queryPatched", hasPatchedPermissionsQuery(navigatorRef), 0.08, null),
          createCheck("empty.chrome.global", isChromeLike(userAgent) && isEmptyChromeGlobal(windowRef), 0.06, null)
        ];
        const score = roundScore(checks.reduce((total, check) => total + (check.matched ? check.weight : 0), 0));
        const evidence = checks.filter((check) => check.matched).map((check) => check.name);
        const verdict = score >= 0.6 ? "bot" : score >= 0.25 ? "suspicious" : "likely_human";
        return createAssessment(verdict, score, evidence, checks);
      }
    });
  }
  function createAssessment(verdict, score, evidence, checks) {
    return {
      verdict,
      score,
      confidence: score >= 0.6 ? "high" : score >= 0.25 ? "medium" : evidence.length > 0 ? "low" : "none",
      evidence,
      checks
    };
  }
  function createCheck(name, matched, weight, detail) {
    return {
      name,
      matched: Boolean(matched),
      weight,
      detail
    };
  }
  function normalizeLanguages(languages) {
    return Array.isArray(languages) ? languages.filter((language) => typeof language === "string" && language.length > 0) : [];
  }
  function hasZeroOuterWindow(windowRef) {
    const outerWidth = safeNumber(windowRef.outerWidth);
    const outerHeight = safeNumber(windowRef.outerHeight);
    const innerWidth = safeNumber(windowRef.innerWidth);
    const innerHeight = safeNumber(windowRef.innerHeight);
    return outerWidth === 0 && outerHeight === 0 && (Number(innerWidth) > 0 || Number(innerHeight) > 0);
  }
  function readWindowSize(windowRef) {
    return {
      outerWidth: safeNumber(windowRef.outerWidth),
      outerHeight: safeNumber(windowRef.outerHeight),
      innerWidth: safeNumber(windowRef.innerWidth),
      innerHeight: safeNumber(windowRef.innerHeight)
    };
  }
  function isChromeLike(userAgent) {
    return /Chrome|Chromium|CriOS|Edg/u.test(userAgent) && !/Firefox|FxiOS/u.test(userAgent);
  }
  function roundScore(value) {
    return Math.round(Math.min(1, value) * 1e3) / 1e3;
  }
  function detectLanguageIssues(language, languages) {
    const issues = [];
    if (language && !/^[a-zA-Z0-9_-]{2,35}$/u.test(language)) {
      issues.push("invalid_language");
    }
    if (language && languages.length > 0 && languages[0] !== language) {
      issues.push("primary_language_mismatch");
    }
    if (new Set(languages).size !== languages.length) {
      issues.push("duplicate_languages");
    }
    return issues;
  }
  function detectHardwareIssues(navigatorRef) {
    const issues = [];
    const concurrency = safeNumber(navigatorRef.hardwareConcurrency);
    const memory = safeNumber(navigatorRef.deviceMemory);
    if (concurrency !== null && (concurrency === 0 || concurrency > 128)) {
      issues.push("hardware_concurrency_range");
    }
    if (memory !== null && (memory < 0.25 || memory > 128)) {
      issues.push("device_memory_range");
    }
    return issues;
  }
  function hasPluginInconsistency(plugins, mimeTypes) {
    if (plugins.length > 0 && mimeTypes.length === 0) {
      return true;
    }
    const pdfPlugins = plugins.filter((plugin) => /PDF|Acrobat/u.test(safeString(plugin.name) || "")).length;
    return pdfPlugins > 2 || plugins.some((plugin) => Number.isFinite(plugin.length) && Number(plugin.length) > 0 && !plugin[0]);
  }
  function summarizePlugins(plugins, mimeTypes) {
    return { pluginCount: plugins.length, mimeTypeCount: mimeTypes.length };
  }
  function hasPatchedPermissionsQuery(navigatorRef) {
    const query = navigatorRef && navigatorRef.permissions && navigatorRef.permissions.query;
    if (typeof query !== "function") {
      return false;
    }
    try {
      return !/\[native code\]/u.test(Function.prototype.toString.call(query));
    } catch (_error) {
      return false;
    }
  }
  function isEmptyChromeGlobal(windowRef) {
    return Boolean(windowRef.chrome && typeof windowRef.chrome === "object" && Object.keys(windowRef.chrome).length === 0);
  }

  // src/collectors/browser-features.js
  var API_FEATURE_GROUPS = Object.freeze({
    javascript: Object.freeze(["Promise", "Symbol", "Proxy", "Reflect", "Map", "Set", "WeakMap", "WeakSet", "BigInt", "Atomics", "SharedArrayBuffer", "ArrayBuffer", "WebAssembly"]),
    browser: Object.freeze(["fetch", "WebSocket", "Worker", "IntersectionObserver", "ResizeObserver", "MutationObserver", "requestIdleCallback", "speechSynthesis", "performance", "Notification"]),
    storage: Object.freeze(["localStorage", "sessionStorage", "indexedDB", "crypto"]),
    navigator: Object.freeze(["bluetooth", "clipboard", "credentials", "geolocation", "mediaDevices", "serviceWorker", "permissions"])
  });
  var CSS_FEATURES = Object.freeze([
    ["webkitAppearance", "-webkit-appearance", "none"],
    ["mozAppearance", "-moz-appearance", "none"],
    ["accentColor", "accent-color", "auto"],
    ["containerQueries", "container-type", "inline-size"],
    ["oklchColor", "color", "oklch(0.5 0.2 240)"],
    ["viewTransitions", "view-transition-name", "root"],
    ["anchorPositioning", "anchor-name", "--a"]
  ]);
  function createApiFeaturesCollector() {
    return createCollector({
      id: "browser.apiFeatures",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
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
  function createCssFeaturesCollector() {
    return createCollector({
      id: "browser.cssFeatures",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.35,
      hashable: false,
      collect(context) {
        const windowRef = getWindowRef(context);
        const cssRef = windowRef.CSS;
        if (!cssRef || typeof cssRef.supports !== "function") {
          return null;
        }
        return Object.fromEntries(CSS_FEATURES.map(([key, property, value]) => [key, supportsCss(cssRef, property, value)]));
      }
    });
  }
  function createNetworkConnectionCollector() {
    return createCollector({
      id: "network.connection",
      version: "1",
      category: "network",
      sensitivity: "medium",
      mode: "passive",
      stability: "volatile",
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
  function createPerformanceMemoryCollector() {
    return createCollector({
      id: "performance.memory",
      version: "1",
      category: "runtime",
      sensitivity: "medium",
      mode: "passive",
      stability: "volatile",
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
  var VENDOR_GLOBALS = Object.freeze([
    ["chrome", "chrome"],
    ["safari", "safari"],
    ["firefoxIos", "__firefox__"],
    ["chromeIos", "__crWeb"],
    ["edgeIos", "__edgeTrackingPreventionStatistics"],
    ["yandex", "yandex"],
    ["opera", "opr"]
  ]);
  var DOM_BLOCKER_BAITS = Object.freeze([
    ["generic-ad", "ad adsbox advertisement banner_ad pub_300x250 text-ad textAd"],
    ["ad-server", "adserver ad-banner ad-unit ad-zone ad-placement"],
    ["doubleclick", "doubleclick dart-ad"],
    ["google-ads", "google-ad googleads adsbygoogle"],
    ["sponsor", "sponsor sponsored-link sponsored_content"],
    ["analytics", "tracking analytics pixel"],
    ["social", "social-share social-widget facebook-like twitter-share"],
    ["newsletter-popup", "newsletter-popup email-capture subscribe-modal"],
    ["cookie-consent", "cookie-banner cookie-consent gdpr-consent"],
    ["taboola", "taboola-outbrain trc_rbox"],
    ["outbrain", "outbrain-widget ob-widget"],
    ["yandex-direct", "yandex_rtb yandex-direct"],
    ["amazon-ads", "amzn-native-ad apstag-ad"],
    ["video-ads", "video-ads preroll-ads ima-ad-container"],
    ["affiliate", "affiliate-link affiliate-widget"]
  ]);
  function createPluginsCollector() {
    return createCollector({
      id: "browser.plugins",
      version: "1",
      category: "runtime",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
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
  function createVendorFlavorsCollector() {
    return createCollector({
      id: "browser.vendorFlavors",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
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
  function createPdfViewerCollector() {
    return createCollector({
      id: "browser.pdfViewer",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
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
  function createApplePayCollector() {
    return createCollector({
      id: "browser.applePay",
      version: "1",
      category: "payments",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 0.45,
      hashable: false,
      collect(context) {
        const windowRef = getWindowRef(context);
        const ApplePaySession = windowRef.ApplePaySession;
        if (!ApplePaySession || typeof ApplePaySession.canMakePayments !== "function") {
          return { status: "no_api" };
        }
        if (windowRef.isSecureContext === false) {
          return { status: "insecure_context" };
        }
        try {
          return { status: ApplePaySession.canMakePayments() ? "enabled" : "disabled" };
        } catch (error) {
          return { status: "error", message: error && error.message ? String(error.message) : "apple_pay_error" };
        }
      }
    });
  }
  function createPrivateClickMeasurementCollector() {
    return createCollector({
      id: "browser.privateClickMeasurement",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.25,
      hashable: false,
      collect(context) {
        const documentRef = context.document;
        if (!documentRef || typeof documentRef.createElement !== "function") {
          return null;
        }
        const link = documentRef.createElement("a");
        const sourceId = Object.prototype.hasOwnProperty.call(link, "attributionSourceId") ? link.attributionSourceId : link.attributionsourceid;
        if (sourceId === void 0) {
          return null;
        }
        return String(sourceId);
      }
    });
  }
  function createDomBlockersCollector() {
    return createCollector({
      id: "browser.domBlockers",
      version: "2",
      category: "runtime",
      sensitivity: "medium",
      mode: "active",
      stability: "volatile",
      weight: 0.65,
      hashable: false,
      collect(context) {
        const documentRef = context.document;
        if (!documentRef || !documentRef.body || typeof documentRef.createElement !== "function") {
          return null;
        }
        const windowRef = getWindowRef(context);
        const container = documentRef.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-10000px";
        container.style.top = "-10000px";
        const baitElements = createBaitElements(documentRef);
        for (const bait of baitElements) {
          container.appendChild(bait.element);
        }
        documentRef.body.appendChild(container);
        try {
          const blocked = baitElements.filter((bait) => isBlocked(bait.element, windowRef)).map((bait) => bait.name).sort();
          return { checked: baitElements.length, blocked, checksum: blocked.join("|") };
        } finally {
          if (container.parentNode && typeof container.parentNode.removeChild === "function") {
            container.parentNode.removeChild(container);
          }
        }
      }
    });
  }
  function createBaitElements(documentRef) {
    return DOM_BLOCKER_BAITS.map(([name, className]) => {
      const element = documentRef.createElement("div");
      element.className = className;
      element.textContent = name;
      element.style.width = "1px";
      element.style.height = "1px";
      return { name, element };
    });
  }
  function isBlocked(element, windowRef) {
    if (element.offsetParent === null || element.offsetHeight === 0 || element.offsetWidth === 0) {
      return true;
    }
    if (typeof windowRef.getComputedStyle !== "function") {
      return false;
    }
    const style = windowRef.getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
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

  // src/browser-quirks.js
  function detectBrowserQuirks(context = {}) {
    const navigatorRef = context.navigator || null;
    const windowRef = context.window || context.global || {};
    const screenRef = context.screen || null;
    const userAgent = String(navigatorRef && navigatorRef.userAgent || "");
    const platform = String(navigatorRef && navigatorRef.platform || "");
    const uaData = navigatorRef && navigatorRef.userAgentData ? navigatorRef.userAgentData : null;
    const uaPlatform = String(uaData && uaData.platform || "");
    const brandNames = normalizeBrandNames(uaData && uaData.brands);
    const screenWidth = safeNumber2(screenRef && screenRef.width);
    const screenHeight = safeNumber2(screenRef && screenRef.height);
    const hardwareConcurrency = safeNumber2(navigatorRef && navigatorRef.hardwareConcurrency);
    const firefoxMatch = /Firefox\/(\d+)/u.exec(userAgent);
    const firefoxIosMatch = /FxiOS\/(\d+)/u.exec(userAgent);
    const safariMatch = /Version\/(\d+)/u.exec(userAgent);
    const samsungMatch = /SamsungBrowser\/(\d+)/u.exec(userAgent);
    const chromeMatch = /(?:Chrome|Chromium|CriOS)\/(\d+)/u.exec(userAgent);
    const chromiumFromBrand = brandNames.some((name) => /Chromium|Google Chrome|Microsoft Edge/u.test(name));
    const chromiumFromUa = /Chrome\/|Chromium\/|CriOS\/|Edg\//u.test(userAgent);
    const featureSignals = Object.freeze({
      chromium: countTruthy([
        Boolean(windowRef.chrome && (windowRef.chrome.runtime || windowRef.chrome.loadTimes || windowRef.chrome.csi)),
        "webkitStorageInfo" in windowRef,
        "webkitResolveLocalFileSystemURL" in windowRef,
        Boolean(navigatorRef && navigatorRef.userAgentData),
        supportsCss2(windowRef, "selector(:has(*))", "")
      ]),
      gecko: countTruthy([
        "mozInnerScreenX" in windowRef,
        "mozPaintCount" in windowRef,
        Boolean(navigatorRef && (navigatorRef.buildID || navigatorRef.buildId)),
        supportsCss2(windowRef, "-moz-appearance", "none")
      ]),
      webkit: countTruthy([
        "WebKitCSSMatrix" in windowRef,
        "webkitRequestAnimationFrame" in windowRef,
        "webkitAudioContext" in windowRef,
        supportsCss2(windowRef, "-webkit-touch-callout", "none"),
        Boolean(windowRef.safari)
      ])
    });
    const geckoFeature = featureSignals.gecko >= 1;
    const chromiumFeature = featureSignals.chromium >= 1;
    const webKitFeature = featureSignals.webkit >= 1;
    const isFirefox = Boolean(firefoxMatch || geckoFeature) && !/Seamonkey\//u.test(userAgent);
    const isChromium = (chromiumFromBrand || chromiumFromUa || chromiumFeature) && !isFirefox;
    const isSafari = /Safari\//u.test(userAgent) && !isChromium && !/FxiOS\/|OPR\/|SamsungBrowser\//u.test(userAgent);
    const isWebKit = /AppleWebKit\//u.test(userAgent) || webKitFeature;
    const isIPad = platform === "iPad" || /iPad/u.test(userAgent) || platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1;
    const isIos = /iPad|iPhone|iPod/u.test(platform) || /iPad|iPhone|iPod/u.test(userAgent) || isIPad;
    const isAndroid = /Android/u.test(userAgent) || uaPlatform === "Android";
    const safariMajor = safariMatch ? Number(safariMatch[1]) : null;
    const firefoxMajor = firefoxMatch ? Number(firefoxMatch[1]) : null;
    const firefoxIosMajor = firefoxIosMatch ? Number(firefoxIosMatch[1]) : null;
    const chromiumMajor = chromeMatch ? Number(chromeMatch[1]) : null;
    const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;
    return Object.freeze({
      engine: isFirefox ? "gecko" : isChromium ? "chromium" : isWebKit ? "webkit" : "unknown",
      featureSignals,
      isAndroid,
      isChromium,
      isFirefox,
      isFirefox120OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 120),
      isFirefox143OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 143),
      isFirefoxResistFingerprintingLikely: Boolean(isFirefox && hardwareConcurrency === 2 && screenWidth === 1e3 && screenHeight === 1e3),
      isIos,
      isIPad,
      isIosDesktopMode: Boolean(platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1),
      isOldMobileSafari: Boolean(isIos && isSafari && safariMajor !== null && safariMajor <= 11),
      isSafari,
      isDesktopSafari: Boolean(isSafari && !isIos),
      isSafari17OrNewer: Boolean(isSafari && safariMajor !== null && safariMajor >= 17),
      isSamsungInternet: Boolean(samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))),
      isSamsungInternet26OrNewer: Boolean((samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))) && samsungMajor !== null && samsungMajor >= 26),
      isWebKit,
      chromiumMajor,
      firefoxMajor,
      firefoxIosMajor,
      safariMajor,
      samsungMajor
    });
  }
  function shouldSuppressSignal(signal, quirks) {
    if (signal === "audio") {
      return Boolean(quirks.isSafari17OrNewer || quirks.isOldMobileSafari || quirks.isSamsungInternet26OrNewer || quirks.isFirefoxResistFingerprintingLikely);
    }
    if (signal === "canvas") {
      return Boolean(quirks.isSafari17OrNewer || quirks.isFirefox120OrNewer || quirks.isFirefoxResistFingerprintingLikely);
    }
    if (signal === "screen.metrics") {
      return Boolean(quirks.isFirefoxResistFingerprintingLikely);
    }
    if (signal === "screen.frame") {
      return Boolean(quirks.isSafari17OrNewer || quirks.isFirefox143OrNewer || quirks.isFirefoxResistFingerprintingLikely);
    }
    if (signal === "hardware.concurrency") {
      return false;
    }
    return false;
  }
  function getSuppressionReason(signal, quirks) {
    if (!shouldSuppressSignal(signal, quirks)) {
      return null;
    }
    if (quirks.isFirefoxResistFingerprintingLikely) {
      return "firefox_resist_fingerprinting";
    }
    if (quirks.isSafari17OrNewer) {
      return "safari_17_unstable_source";
    }
    if (quirks.isFirefox120OrNewer && signal === "canvas") {
      return "firefox_canvas_randomization";
    }
    if (quirks.isFirefox143OrNewer && signal === "screen.frame") {
      return "firefox_screen_frame_randomization";
    }
    if (quirks.isSamsungInternet26OrNewer) {
      return "samsung_internet_audio_instability";
    }
    if (quirks.isOldMobileSafari) {
      return "old_mobile_safari_audio_requires_gesture";
    }
  }
  function normalizeHardwareConcurrency(value, quirks) {
    const concurrency = safeNumber2(value);
    if (concurrency === null) {
      return null;
    }
    if (quirks.isFirefox143OrNewer || quirks.isFirefoxResistFingerprintingLikely) {
      return concurrency <= 4 ? 4 : 8;
    }
    return concurrency;
  }
  function normalizeBrandNames(brands) {
    if (!Array.isArray(brands)) {
      return [];
    }
    return brands.map((brand) => String(brand && brand.brand ? brand.brand : "")).filter(Boolean);
  }
  function safeNumber2(value) {
    return Number.isFinite(value) ? Number(value) : null;
  }
  function countTruthy(values) {
    return values.filter(Boolean).length;
  }
  function supportsCss2(windowRef, property, value) {
    try {
      return Boolean(windowRef.CSS && typeof windowRef.CSS.supports === "function" && windowRef.CSS.supports(property, value));
    } catch (_error) {
      return false;
    }
  }

  // src/collectors/display.js
  var cachedScreenFrame = null;
  var screenFrameWatcherBound = false;
  function createScreenCollector() {
    return createCollector({
      id: "screen.metrics",
      version: "2",
      category: "display",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 1.1,
      collect(context) {
        const screenRef = context.screen;
        if (!screenRef) {
          return null;
        }
        const quirks = detectBrowserQuirks(context);
        if (shouldSuppressSignal("screen.metrics", quirks)) {
          return { status: "suppressed", reason: getSuppressionReason("screen.metrics", quirks) };
        }
        return {
          width: roundDimension(screenRef.width),
          height: roundDimension(screenRef.height),
          availWidth: roundDimension(screenRef.availWidth),
          availHeight: roundDimension(screenRef.availHeight),
          colorDepth: safeNumber(screenRef.colorDepth),
          pixelDepth: safeNumber(screenRef.pixelDepth),
          devicePixelRatio: roundRatio(context.global && context.global.devicePixelRatio)
        };
      }
    });
  }
  function createScreenFrameCollector() {
    return createCollector({
      id: "screen.frame",
      version: "1",
      category: "display",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 0.7,
      collect(context) {
        const quirks = detectBrowserQuirks(context);
        if (shouldSuppressSignal("screen.frame", quirks)) {
          return { status: "suppressed", reason: getSuppressionReason("screen.frame", quirks) };
        }
        const windowRef = getWindowRef(context);
        const screenRef = context.screen;
        if (!screenRef) {
          return null;
        }
        ensureScreenFrameWatcher(context);
        const outerWidth = roundDimension(windowRef.outerWidth);
        const outerHeight = roundDimension(windowRef.outerHeight);
        const innerWidth = roundDimension(windowRef.innerWidth);
        const innerHeight = roundDimension(windowRef.innerHeight);
        const frame = {
          outerWidth,
          outerHeight,
          innerWidth,
          innerHeight,
          left: roundDimension(windowRef.screenX ?? windowRef.screenLeft),
          top: roundDimension(windowRef.screenY ?? windowRef.screenTop),
          frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
          frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
          availDeltaWidth: roundDimension(screenRef.width) !== null && roundDimension(screenRef.availWidth) !== null ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth)) : null,
          availDeltaHeight: roundDimension(screenRef.height) !== null && roundDimension(screenRef.availHeight) !== null ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight)) : null,
          fullscreen: isFullscreen(context),
          rounded: true,
          source: "direct",
          cached: false
        };
        if (!frame.fullscreen && hasUsableFrame(frame)) {
          cachedScreenFrame = Object.freeze({ ...frame });
        }
        if (!frame.fullscreen && isZeroFrame(frame) && cachedScreenFrame) {
          return { ...cachedScreenFrame, source: "cache", cached: true };
        }
        return frame;
      }
    });
  }
  function createMediaPreferencesCollector() {
    return createCollector({
      id: "display.mediaPreferences",
      version: "1",
      category: "display",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.8,
      collect(context) {
        const matchMedia = getMatchMedia(context);
        if (!matchMedia) {
          return null;
        }
        return {
          colorGamut: firstMediaMatch(matchMedia, "color-gamut", ["rec2020", "p3", "srgb"]),
          forcedColors: mediaBoolean(matchMedia, "forced-colors", "active"),
          invertedColors: mediaBoolean(matchMedia, "inverted-colors", "inverted"),
          monochrome: monochromeDepth(matchMedia),
          prefersContrast: firstMediaMatch(matchMedia, "prefers-contrast", ["more", "less", "no-preference", "forced"]),
          prefersReducedMotion: mediaBoolean(matchMedia, "prefers-reduced-motion", "reduce"),
          prefersReducedTransparency: mediaBoolean(matchMedia, "prefers-reduced-transparency", "reduce"),
          dynamicRange: firstMediaMatch(matchMedia, "dynamic-range", ["high", "standard"])
        };
      }
    });
  }
  function firstMediaMatch(matchMedia, feature, values) {
    for (const value of values) {
      if (matches(matchMedia, `(${feature}: ${value})`)) {
        return value;
      }
    }
    return null;
  }
  function mediaBoolean(matchMedia, feature, activeValue) {
    if (matches(matchMedia, `(${feature}: ${activeValue})`)) {
      return true;
    }
    if (matches(matchMedia, `(${feature})`)) {
      return false;
    }
    return null;
  }
  function monochromeDepth(matchMedia) {
    for (let depth = 8; depth >= 0; depth -= 1) {
      if (matches(matchMedia, `(min-monochrome: ${depth})`)) {
        return depth;
      }
    }
    return null;
  }
  function matches(matchMedia, query) {
    try {
      return Boolean(matchMedia(query).matches);
    } catch (_error) {
      return false;
    }
  }
  function roundDimension(value) {
    const number = safeNumber(value);
    return number === null ? null : Math.round(number);
  }
  function roundRatio(value) {
    const number = safeNumber(value);
    return number === null ? null : Math.round(number * 1e3) / 1e3;
  }
  function isFullscreen(context) {
    const documentRef = context.document || null;
    const windowRef = getWindowRef(context);
    return Boolean(documentRef && (documentRef.fullscreenElement || documentRef.webkitFullscreenElement) || windowRef.fullScreen === true);
  }
  function hasUsableFrame(frame) {
    return [frame.frameWidth, frame.frameHeight, frame.availDeltaWidth, frame.availDeltaHeight].some((value) => Number(value) > 0);
  }
  function isZeroFrame(frame) {
    return [frame.frameWidth, frame.frameHeight, frame.availDeltaWidth, frame.availDeltaHeight].every((value) => value === 0);
  }
  function ensureScreenFrameWatcher(context) {
    const windowRef = getWindowRef(context);
    if (screenFrameWatcherBound || typeof windowRef.addEventListener !== "function") {
      return;
    }
    const update = () => {
      const current = snapshotScreenFrame(context);
      if (hasUsableFrame(current) && !current.fullscreen) {
        cachedScreenFrame = Object.freeze(current);
      }
    };
    windowRef.addEventListener("resize", update, { passive: true });
    windowRef.addEventListener("orientationchange", update, { passive: true });
    screenFrameWatcherBound = true;
  }
  function snapshotScreenFrame(context) {
    const windowRef = getWindowRef(context);
    const screenRef = context.screen;
    const outerWidth = roundDimension(windowRef.outerWidth);
    const outerHeight = roundDimension(windowRef.outerHeight);
    const innerWidth = roundDimension(windowRef.innerWidth);
    const innerHeight = roundDimension(windowRef.innerHeight);
    return {
      outerWidth,
      outerHeight,
      innerWidth,
      innerHeight,
      left: roundDimension(windowRef.screenX ?? windowRef.screenLeft),
      top: roundDimension(windowRef.screenY ?? windowRef.screenTop),
      frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
      frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
      availDeltaWidth: roundDimension(screenRef.width) !== null && roundDimension(screenRef.availWidth) !== null ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth)) : null,
      availDeltaHeight: roundDimension(screenRef.height) !== null && roundDimension(screenRef.availHeight) !== null ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight)) : null,
      fullscreen: isFullscreen(context),
      rounded: true,
      source: "watcher",
      cached: false
    };
  }

  // src/collectors/fonts.js
  var FONT_CANDIDATES = Object.freeze([
    "Arial",
    "Arial Unicode MS",
    "Avenir Next",
    "Book Antiqua",
    "Calibri",
    "Cambria",
    "Candara",
    "Comic Sans MS",
    "Courier New",
    "DejaVu Sans",
    "Georgia",
    "Helvetica Neue",
    "Lucida Console",
    "Lucida Sans Unicode",
    "Menlo",
    "Monaco",
    "Noto Color Emoji",
    "Palatino",
    "Roboto",
    "San Francisco",
    "Segoe UI",
    "Tahoma",
    "Times New Roman",
    "Trebuchet MS",
    "Ubuntu",
    "Verdana"
  ]);
  var BASE_FONTS = Object.freeze(["monospace", "sans-serif", "serif"]);
  var PREFERENCE_SAMPLES = Object.freeze({
    defaultText: "mmmmmmmmmmlli",
    denseText: "mmMwWLliI0O&1",
    emoji: "emoji",
    math: "math"
  });
  function createFontsCollector() {
    return createCollector({
      id: "fonts.available",
      version: "2",
      category: "fonts",
      sensitivity: "high",
      mode: "active",
      stability: "volatile",
      weight: 1.1,
      prepare(context) {
        return collectAvailableFonts(context);
      },
      collect(context, prepared) {
        if (prepared !== void 0) {
          return prepared;
        }
        return collectAvailableFonts(context);
      }
    });
  }
  function createFontPreferencesCollector() {
    return createCollector({
      id: "fonts.preferences",
      version: "2",
      category: "fonts",
      sensitivity: "medium",
      mode: "active",
      stability: "volatile",
      weight: 0.7,
      prepare(context) {
        return collectFontPreferences(context);
      },
      collect(context, prepared) {
        if (prepared !== void 0) {
          return prepared;
        }
        return collectFontPreferences(context);
      }
    });
  }
  function collectAvailableFonts(context) {
    const documentRef = context.document;
    if (!documentRef) {
      return null;
    }
    if (documentRef.fonts && typeof documentRef.fonts.check === "function") {
      const available = FONT_CANDIDATES.filter((font) => documentRef.fonts.check(`12px "${font}"`));
      return summarizeFonts("font-check", available);
    }
    const measured = measureFonts(documentRef);
    return measured ? summarizeFonts("layout", measured) : null;
  }
  function collectFontPreferences(context) {
    const documentRef = context.document;
    if (!canMeasure(documentRef)) {
      return null;
    }
    const devicePixelRatio = normalizeDevicePixelRatio(context);
    return withMeasurementDocument(documentRef, (measurementDocument) => {
      const container = createContainer(measurementDocument);
      try {
        measurementDocument.body.appendChild(container);
        const sizes = {};
        for (const family of BASE_FONTS) {
          const element = createSpan(measurementDocument, family, PREFERENCE_SAMPLES.defaultText, "72px");
          container.appendChild(element);
          sizes[family] = readBox(element, devicePixelRatio);
        }
        sizes.presets = measurePreferencePresets(measurementDocument, container, devicePixelRatio);
        sizes.devicePixelRatio = devicePixelRatio;
        return sizes;
      } finally {
        removeNode(container);
      }
    });
  }
  function summarizeFonts(method, available) {
    const sorted = available.slice().sort();
    return {
      method,
      checked: FONT_CANDIDATES.length,
      available: sorted,
      checksum: checksumString(sorted.join("|"))
    };
  }
  function measureFonts(documentRef) {
    if (!canMeasure(documentRef)) {
      return null;
    }
    return withMeasurementDocument(documentRef, (measurementDocument) => measureFontsInDocument(measurementDocument));
  }
  function measureFontsInDocument(documentRef) {
    const container = createContainer(documentRef);
    try {
      documentRef.body.appendChild(container);
      const baseMeasurements = {};
      for (const baseFont of BASE_FONTS) {
        const base = createSpan(documentRef, baseFont, PREFERENCE_SAMPLES.denseText, "48px");
        container.appendChild(base);
        baseMeasurements[baseFont] = readBox(base);
      }
      const available = [];
      for (const font of FONT_CANDIDATES) {
        if (isFontAvailable(documentRef, container, font, baseMeasurements)) {
          available.push(font);
        }
      }
      return available;
    } finally {
      removeNode(container);
    }
  }
  function withMeasurementDocument(documentRef, callback) {
    const frame = createMeasurementFrame(documentRef);
    if (!frame) {
      return callback(documentRef);
    }
    try {
      documentRef.body.appendChild(frame);
      const measurementDocument = frame.contentDocument || frame.contentWindow && frame.contentWindow.document;
      if (canMeasure(measurementDocument)) {
        return callback(measurementDocument);
      }
      return callback(documentRef);
    } finally {
      removeNode(frame);
    }
  }
  function createMeasurementFrame(documentRef) {
    try {
      const frame = documentRef.createElement("iframe");
      if (!frame || !frame.style) {
        return null;
      }
      frame.setAttribute && frame.setAttribute("aria-hidden", "true");
      frame.style.position = "absolute";
      frame.style.visibility = "hidden";
      frame.style.left = "-10000px";
      frame.style.top = "-10000px";
      frame.style.width = "0";
      frame.style.height = "0";
      return frame;
    } catch (_error) {
      return null;
    }
  }
  function isFontAvailable(documentRef, container, font, baseMeasurements) {
    for (const baseFont of BASE_FONTS) {
      const span = createSpan(documentRef, `"${font}",${baseFont}`, PREFERENCE_SAMPLES.denseText, "48px");
      container.appendChild(span);
      const box = readBox(span);
      if (box.width !== baseMeasurements[baseFont].width) {
        return true;
      }
    }
    return false;
  }
  function canMeasure(documentRef) {
    return Boolean(documentRef && documentRef.body && typeof documentRef.createElement === "function");
  }
  function createContainer(documentRef) {
    const container = documentRef.createElement("div");
    container.style.position = "absolute";
    container.style.visibility = "hidden";
    container.style.left = "-10000px";
    container.style.top = "-10000px";
    return container;
  }
  function createSpan(documentRef, fontFamily, text, fontSize) {
    const span = documentRef.createElement("span");
    span.textContent = text;
    span.style.fontFamily = fontFamily;
    span.style.fontSize = fontSize;
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    return span;
  }
  function readBox(element, devicePixelRatio = 1) {
    const width = safeNumber(element.offsetWidth);
    const height = safeNumber(element.offsetHeight);
    return {
      width,
      height,
      normalizedWidth: width === null ? null : Math.round(width / devicePixelRatio * 100) / 100
    };
  }
  function measurePreferencePresets(documentRef, container, devicePixelRatio) {
    const presets = {};
    for (const [name, sample] of Object.entries(PREFERENCE_SAMPLES)) {
      presets[name] = {};
      for (const family of BASE_FONTS) {
        const element = createSpan(documentRef, family, sample, name === "emoji" ? "48px" : "64px");
        container.appendChild(element);
        presets[name][family] = readBox(element, devicePixelRatio).normalizedWidth;
      }
    }
    return presets;
  }
  function normalizeDevicePixelRatio(context) {
    const ratio = safeNumber(context && context.global && context.global.devicePixelRatio);
    return ratio && ratio > 0 ? ratio : 1;
  }
  function removeNode(node) {
    if (node && node.parentNode && typeof node.parentNode.removeChild === "function") {
      node.parentNode.removeChild(node);
    }
  }

  // src/collectors/graphics.js
  var NOISY_WEBGL_EXTENSIONS = Object.freeze([
    "EXT_disjoint_timer_query",
    "EXT_disjoint_timer_query_webgl2",
    "WEBGL_debug_shaders"
  ]);
  function createWebglCollector() {
    return createCollector({
      id: "webgl.renderer",
      version: "2",
      category: "graphics",
      sensitivity: "high",
      mode: "active",
      stability: "stable",
      weight: 1.6,
      collect(context) {
        const gl = getWebglContext(context);
        if (!gl) {
          return null;
        }
        const debugInfo = gl.getExtension ? gl.getExtension("WEBGL_debug_renderer_info") : null;
        return {
          contextAttributes: readContextAttributes(gl),
          drawingBufferWidth: safeNumber(gl.drawingBufferWidth),
          drawingBufferHeight: safeNumber(gl.drawingBufferHeight),
          vendor: getGlParameter(gl, gl.VENDOR),
          renderer: getGlParameter(gl, gl.RENDERER),
          version: getGlParameter(gl, gl.VERSION),
          shadingLanguageVersion: getGlParameter(gl, gl.SHADING_LANGUAGE_VERSION),
          unmaskedVendor: debugInfo ? getGlParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL) : null,
          unmaskedRenderer: debugInfo ? getGlParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL) : null
        };
      }
    });
  }
  function createWebglExtensionsCollector() {
    return createCollector({
      id: "webgl.extensions",
      version: "1",
      category: "graphics",
      sensitivity: "high",
      mode: "active",
      stability: "stable",
      weight: 1.1,
      collect(context) {
        const gl = getWebglContext(context);
        if (!gl) {
          return null;
        }
        const extensions = typeof gl.getSupportedExtensions === "function" ? gl.getSupportedExtensions() : null;
        const rawExtensionList = Array.isArray(extensions) ? extensions.slice().map(String).sort() : [];
        const extensionList = rawExtensionList.filter((extension) => !NOISY_WEBGL_EXTENSIONS.includes(extension));
        const omittedExtensions = rawExtensionList.filter((extension) => NOISY_WEBGL_EXTENSIONS.includes(extension));
        return {
          extensions: extensionList,
          omittedExtensions,
          maxTextureSize: getGlParameter(gl, gl.MAX_TEXTURE_SIZE),
          maxCombinedTextureImageUnits: getGlParameter(gl, gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
          maxRenderbufferSize: getGlParameter(gl, gl.MAX_RENDERBUFFER_SIZE),
          maxCubeMapTextureSize: getGlParameter(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE),
          maxVertexAttribs: getGlParameter(gl, gl.MAX_VERTEX_ATTRIBS),
          maxVertexTextureImageUnits: getGlParameter(gl, gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
          maxVaryingVectors: getGlParameter(gl, gl.MAX_VARYING_VECTORS),
          maxViewportDims: normalizeNumberArray(getGlParameter(gl, gl.MAX_VIEWPORT_DIMS)),
          aliasedLineWidthRange: normalizeNumberArray(getGlParameter(gl, gl.ALIASED_LINE_WIDTH_RANGE)),
          aliasedPointSizeRange: normalizeNumberArray(getGlParameter(gl, gl.ALIASED_POINT_SIZE_RANGE))
        };
      }
    });
  }
  function createCanvasCollector() {
    return createCollector({
      id: "canvas.checksum",
      version: "2",
      category: "graphics",
      sensitivity: "high",
      mode: "active",
      stability: "stable",
      weight: 1.4,
      collect(context) {
        const quirks = detectBrowserQuirks(context);
        if (shouldSuppressSignal("canvas", quirks)) {
          return { status: "suppressed", reason: getSuppressionReason("canvas", quirks) };
        }
        const canvas = createCanvas(context, 240, 80);
        if (!canvas) {
          return null;
        }
        const canvasContext = canvas.getContext && canvas.getContext("2d");
        if (!canvasContext || typeof canvas.toDataURL !== "function") {
          return null;
        }
        return {
          status: "ok",
          winding: detectWinding(canvasContext),
          geometry: renderGeometry(canvas, canvasContext),
          text: renderText(canvas, canvasContext)
        };
      }
    });
  }
  function getWebglContext(context) {
    const documentRef = context.document;
    if (!documentRef || typeof documentRef.createElement !== "function") {
      return null;
    }
    const canvas = documentRef.createElement("canvas");
    return canvas.getContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  }
  function createCanvas(context, width, height) {
    const documentRef = context.document;
    if (!documentRef || typeof documentRef.createElement !== "function") {
      return null;
    }
    const canvas = documentRef.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  function readContextAttributes(gl) {
    if (typeof gl.getContextAttributes !== "function") {
      return null;
    }
    try {
      const attributes = gl.getContextAttributes();
      if (!attributes || typeof attributes !== "object") {
        return null;
      }
      return {
        alpha: safeBoolean2(attributes.alpha),
        antialias: safeBoolean2(attributes.antialias),
        depth: safeBoolean2(attributes.depth),
        desynchronized: safeBoolean2(attributes.desynchronized),
        failIfMajorPerformanceCaveat: safeBoolean2(attributes.failIfMajorPerformanceCaveat),
        powerPreference: typeof attributes.powerPreference === "string" ? attributes.powerPreference : null,
        premultipliedAlpha: safeBoolean2(attributes.premultipliedAlpha),
        preserveDrawingBuffer: safeBoolean2(attributes.preserveDrawingBuffer),
        stencil: safeBoolean2(attributes.stencil)
      };
    } catch (_error) {
      return null;
    }
  }
  function safeBoolean2(value) {
    return typeof value === "boolean" ? value : null;
  }
  function getGlParameter(gl, parameter) {
    try {
      const value = gl.getParameter(parameter);
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || ArrayBuffer.isView(value) ? value : null;
    } catch (_error) {
      return null;
    }
  }
  function normalizeNumberArray(value) {
    if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
      return null;
    }
    return Array.from(value).map((item) => safeNumber(item));
  }
  function detectWinding(canvasContext) {
    if (typeof canvasContext.rect !== "function" || typeof canvasContext.isPointInPath !== "function") {
      return null;
    }
    canvasContext.rect(0, 0, 10, 10);
    canvasContext.rect(2, 2, 6, 6);
    return canvasContext.isPointInPath(5, 5, "evenodd") === false;
  }
  function renderGeometry(canvas, canvasContext) {
    resetCanvas(canvas, 240, 80);
    canvasContext.fillStyle = "#f60";
    canvasContext.fillRect(8, 8, 96, 28);
    canvasContext.fillStyle = "#069";
    canvasContext.globalCompositeOperation = "multiply";
    canvasContext.beginPath();
    canvasContext.arc(80, 42, 24, 0, Math.PI * 2, true);
    canvasContext.closePath();
    canvasContext.fill();
    return summarizeCanvas(canvas);
  }
  function renderText(canvas, canvasContext) {
    resetCanvas(canvas, 240, 80);
    canvasContext.textBaseline = "alphabetic";
    canvasContext.font = '11pt "Times New Roman"';
    canvasContext.fillStyle = "#f60";
    canvasContext.fillRect(100, 1, 62, 20);
    canvasContext.fillStyle = "#069";
    canvasContext.fillText("FingerprintJS by BotBlocker 0.1", 2, 18);
    canvasContext.fillStyle = "rgba(102, 204, 0, 0.65)";
    canvasContext.fillText("mwmw 12345", 4, 48);
    return summarizeCanvas(canvas, true);
  }
  function resetCanvas(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
  }
  function summarizeCanvas(canvas, verifyStable = false) {
    try {
      const dataUrl = canvas.toDataURL();
      if (verifyStable && canvas.toDataURL() !== dataUrl) {
        return {
          status: "unstable",
          reason: "canvas_noise_detected"
        };
      }
      return {
        status: "ok",
        length: dataUrl.length,
        checksum: checksumString(dataUrl)
      };
    } catch (error) {
      return {
        status: "unstable",
        reason: error && error.message ? String(error.message) : "canvas_read_failed"
      };
    }
  }
  function createWebglPrecisionCollector() {
    return createCollector({
      id: "webgl.precision",
      version: "1",
      category: "graphics",
      sensitivity: "high",
      mode: "active",
      stability: "stable",
      weight: 0.65,
      collect(context) {
        const gl = getWebglContext(context);
        if (!gl || typeof gl.getShaderPrecisionFormat !== "function") {
          return null;
        }
        return {
          vertexHighFloat: readShaderPrecision(gl, gl.VERTEX_SHADER, gl.HIGH_FLOAT),
          fragmentHighFloat: readShaderPrecision(gl, gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
          vertexMediumFloat: readShaderPrecision(gl, gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
          fragmentMediumFloat: readShaderPrecision(gl, gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT)
        };
      }
    });
  }
  function readShaderPrecision(gl, shaderType, precisionType) {
    try {
      const format = gl.getShaderPrecisionFormat(shaderType, precisionType);
      return format ? {
        precision: safeNumber(format.precision),
        rangeMin: safeNumber(format.rangeMin),
        rangeMax: safeNumber(format.rangeMax)
      } : null;
    } catch (_error) {
      return null;
    }
  }

  // src/collectors/hardware.js
  function createHardwareCollector() {
    return createCollector({
      id: "hardware",
      version: "3",
      category: "hardware",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 1,
      collect(context) {
        const navigatorRef = context.navigator;
        if (!navigatorRef) {
          return null;
        }
        const quirks = detectBrowserQuirks(context);
        return {
          hardwareConcurrency: normalizeHardwareConcurrency(navigatorRef.hardwareConcurrency, quirks),
          deviceMemory: safeNumber(navigatorRef.deviceMemory),
          maxTouchPoints: safeNumber(navigatorRef.maxTouchPoints)
        };
      }
    });
  }
  function createTouchSupportCollector() {
    return createCollector({
      id: "hardware.touch",
      version: "1",
      category: "hardware",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.45,
      collect(context) {
        const navigatorRef = context.navigator;
        const windowRef = getWindowRef(context);
        const matchMedia = getMatchMedia(context);
        return {
          maxTouchPoints: navigatorRef ? safeNumber(navigatorRef.maxTouchPoints) : null,
          touchEvent: typeof windowRef.TouchEvent === "function",
          coarsePointer: matchMedia ? safeMatches(matchMedia, "(pointer: coarse)") : null,
          anyCoarsePointer: matchMedia ? safeMatches(matchMedia, "(any-pointer: coarse)") : null
        };
      }
    });
  }
  function createArchitectureCollector() {
    return createCollector({
      id: "hardware.architecture",
      version: "1",
      category: "hardware",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.5,
      collect() {
        const float = new Float32Array(1);
        const bytes = new Uint8Array(float.buffer);
        float[0] = Infinity;
        return {
          littleEndian: Boolean(1 - Math.min(1, bytes[0])),
          infinityBytePattern: Array.from(bytes).join("-")
        };
      }
    });
  }
  function safeMatches(matchMedia, query) {
    try {
      return Boolean(matchMedia(query).matches);
    } catch (_error) {
      return null;
    }
  }

  // src/collectors/locale.js
  function createLocaleCollector() {
    return createCollector({
      id: "locale",
      version: "1",
      category: "locale",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.8,
      collect(context) {
        const navigatorRef = context.navigator;
        const intlOptions = getDateTimeOptions(context);
        return {
          language: navigatorRef ? navigatorRef.language || null : null,
          languages: navigatorRef && Array.isArray(navigatorRef.languages) ? navigatorRef.languages.slice(0, 10) : [],
          locale: intlOptions.locale || null
        };
      }
    });
  }
  function createTimezoneCollector() {
    return createCollector({
      id: "timezone",
      version: "1",
      category: "locale",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 0.9,
      collect(context) {
        const intlOptions = getDateTimeOptions(context);
        return {
          timeZone: intlOptions.timeZone || null,
          offsetMinutes: (/* @__PURE__ */ new Date()).getTimezoneOffset()
        };
      }
    });
  }
  function createDateTimeLocaleCollector() {
    return createCollector({
      id: "locale.datetime",
      version: "1",
      category: "locale",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.45,
      collect(context) {
        const options = getDateTimeOptions(context);
        return {
          calendar: options.calendar || null,
          numberingSystem: options.numberingSystem || null,
          hourCycle: options.hourCycle || null
        };
      }
    });
  }
  function getDateTimeOptions(context) {
    const globalIntl = context && context.global && context.global.Intl ? context.global.Intl : null;
    const intlRef = globalIntl || (typeof Intl !== "undefined" ? Intl : null);
    return intlRef && intlRef.DateTimeFormat ? intlRef.DateTimeFormat().resolvedOptions() : {};
  }

  // src/collectors/math.js
  function createMathCollector() {
    return createCollector({
      id: "math.fingerprint",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.7,
      collect() {
        return {
          acos: Math.acos(0.12312423423423424),
          acosh: Math.acosh(1e154),
          asin: Math.asin(0.12312423423423424),
          asinh: Math.asinh(1),
          atan: Math.atan(0.5),
          atanh: Math.atanh(0.5),
          cos: Math.cos(10.000000000123),
          cosh: Math.cosh(1),
          exp: Math.exp(1),
          expm1: Math.expm1(1),
          log1p: Math.log1p(10),
          powPI: Math.pow(Math.PI, -100),
          sin: Math.sin(10.000000000123),
          sinh: Math.sinh(1),
          tan: Math.tan(-1e300),
          tanh: Math.tanh(1)
        };
      }
    });
  }

  // src/collectors/media.js
  var DEFAULT_AUDIO_RENDER_TIMEOUT_MS = 1500;
  function createAudioCollector() {
    return createCollector({
      id: "audio.fingerprint",
      version: "2",
      category: "media",
      sensitivity: "high",
      mode: "active",
      stability: "stable",
      weight: 1.2,
      async prepare(context) {
        return collectAudioFingerprint(context);
      },
      async collect(context, prepared) {
        if (prepared !== void 0) {
          return prepared;
        }
        return collectAudioFingerprint(context);
      }
    });
  }
  function createAudioBaseLatencyCollector() {
    return createCollector({
      id: "audio.baseLatency",
      version: "1",
      category: "media",
      sensitivity: "medium",
      mode: "active",
      stability: "stable",
      weight: 0.45,
      collect(context) {
        const quirks = detectBrowserQuirks(context);
        if (shouldSuppressSignal("audio", quirks)) {
          return { status: "suppressed", reason: getSuppressionReason("audio", quirks) };
        }
        const windowRef = getWindowRef(context);
        const AudioContext = windowRef.AudioContext || windowRef.webkitAudioContext;
        if (typeof AudioContext !== "function") {
          return { status: "unsupported" };
        }
        try {
          const audioContext = new AudioContext();
          const value = {
            status: "ok",
            baseLatency: safeNumber(audioContext.baseLatency),
            outputLatency: safeNumber(audioContext.outputLatency),
            sampleRate: safeNumber(audioContext.sampleRate),
            state: typeof audioContext.state === "string" ? audioContext.state : null
          };
          if (typeof audioContext.close === "function") {
            void audioContext.close();
          }
          return value;
        } catch (error) {
          return { status: "error", message: error && error.message ? String(error.message) : "audio_context_error" };
        }
      }
    });
  }
  async function collectAudioFingerprint(context) {
    const quirks = detectBrowserQuirks(context);
    if (shouldSuppressSignal("audio", quirks)) {
      return { status: "suppressed", reason: getSuppressionReason("audio", quirks) };
    }
    const windowRef = getWindowRef(context);
    const OfflineAudioContext = windowRef.OfflineAudioContext || windowRef.webkitOfflineAudioContext;
    if (typeof OfflineAudioContext !== "function") {
      return { status: "unsupported" };
    }
    return renderAudio(OfflineAudioContext, context);
  }
  async function renderAudio(OfflineAudioContext, context) {
    const length = 4096;
    const sampleRate = 44100;
    const audioContext = new OfflineAudioContext(1, length, sampleRate);
    if (typeof audioContext.createOscillator !== "function" || typeof audioContext.startRendering !== "function") {
      return { status: "unsupported" };
    }
    const oscillator = audioContext.createOscillator();
    let compressor = null;
    if (typeof audioContext.createDynamicsCompressor === "function") {
      compressor = audioContext.createDynamicsCompressor();
    }
    oscillator.type = "triangle";
    if (oscillator.frequency && typeof oscillator.frequency.setValueAtTime === "function") {
      oscillator.frequency.setValueAtTime(1e4, audioContext.currentTime || 0);
    }
    if (compressor) {
      configureCompressor(compressor, audioContext.currentTime || 0);
      oscillator.connect(compressor);
      compressor.connect(audioContext.destination);
    } else {
      oscillator.connect(audioContext.destination);
    }
    oscillator.start(0);
    if (typeof oscillator.stop === "function") {
      oscillator.stop(0.05);
    }
    const renderedResult = await resolveRenderedBuffer(audioContext, context);
    if (!renderedResult.ok) {
      return renderedResult.value;
    }
    const rendered = renderedResult.buffer;
    const samples = rendered && typeof rendered.getChannelData === "function" ? rendered.getChannelData(0) : new Float32Array(0);
    return {
      status: "ok",
      sampleRate: safeNumber(rendered && rendered.sampleRate) || sampleRate,
      length: safeNumber(rendered && rendered.length) || length,
      renderAttempts: renderedResult.attempts,
      checksum: checksumSamples(samples)
    };
  }
  function configureCompressor(compressor, currentTime) {
    setAudioParam(compressor.threshold, -50, currentTime);
    setAudioParam(compressor.knee, 40, currentTime);
    setAudioParam(compressor.ratio, 12, currentTime);
    setAudioParam(compressor.attack, 0, currentTime);
    setAudioParam(compressor.release, 0.25, currentTime);
  }
  function setAudioParam(param, value, currentTime) {
    if (param && typeof param.setValueAtTime === "function") {
      param.setValueAtTime(value, currentTime);
    }
  }
  async function resolveRenderedBuffer(audioContext, context) {
    const maxAttempts = 2;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const buffer = await startRenderingOnce(audioContext, context);
        return Object.freeze({ ok: true, buffer, attempts: attempt });
      } catch (error) {
        lastError = error;
        if (!shouldRetryAudioRender(audioContext, attempt, maxAttempts)) {
          break;
        }
        await Promise.resolve();
      }
    }
    return Object.freeze({
      ok: false,
      value: Object.freeze({
        status: audioContext.state === "suspended" ? "suspended" : lastError && lastError.code === "audio_render_timeout" ? "timeout" : "error",
        message: lastError && lastError.message ? String(lastError.message) : "audio_render_failed"
      })
    });
  }
  function startRenderingOnce(audioContext, context) {
    const renderedPromise = new Promise((resolve, reject) => {
      audioContext.oncomplete = (event) => resolve(event && event.renderedBuffer);
      audioContext.onerror = reject;
    });
    const rendered = audioContext.startRendering();
    const pending = rendered && typeof rendered.then === "function" ? rendered : renderedPromise;
    return withAudioTimeout(pending, context);
  }
  function shouldRetryAudioRender(audioContext, attempt, maxAttempts) {
    return attempt < maxAttempts && audioContext.state === "suspended";
  }
  function withAudioTimeout(promise, context) {
    const runtimeTimers = getTimerFns(context && (context.global || context.window));
    const fallbackTimers = getTimerFns(globalThis);
    const timers = runtimeTimers || fallbackTimers;
    const timeoutMs = Number.isFinite(context && context.audioRenderTimeoutMs) ? Math.max(0, Number(context.audioRenderTimeoutMs)) : DEFAULT_AUDIO_RENDER_TIMEOUT_MS;
    if (!timeoutMs || !timers) {
      return promise;
    }
    let timeoutId;
    const timeout = new Promise((_resolve, reject) => {
      timeoutId = timers.set(() => {
        const error = new Error("audio_render_timeout");
        error.code = "audio_render_timeout";
        reject(error);
      }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => timers.clear(timeoutId));
  }
  function getTimerFns(ref) {
    if (!ref || typeof ref.setTimeout !== "function" || typeof ref.clearTimeout !== "function") {
      return null;
    }
    return Object.freeze({
      set: ref.setTimeout.bind(ref),
      clear: ref.clearTimeout.bind(ref)
    });
  }
  function checksumSamples(samples) {
    let summary = "";
    const limit = Math.min(samples.length, 256);
    for (let index = 0; index < limit; index += 1) {
      summary += `${Math.round((Number(samples[index]) || 0) * 1e5)}|`;
    }
    return checksumString(summary);
  }

  // src/errors.js
  function normalizeError(error) {
    if (!error) {
      return Object.freeze({ code: "unknown", message: "Unknown error" });
    }
    return Object.freeze({
      code: error.code || error.name || "error",
      message: error.message || String(error)
    });
  }

  // src/environment.js
  function getGlobal() {
    return globalThis;
  }
  function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }
  function elapsedSince(startedAt) {
    return round(Math.max(0, nowMs() - startedAt), 3);
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  // src/storage.js
  function resolveStorage(storageOption, namespace) {
    if (!storageOption) {
      return null;
    }
    if (storageOption === "local") {
      const globalRef = getGlobal();
      if (!canUseStorage(globalRef, "localStorage")) {
        return null;
      }
      return Object.freeze({
        type: "localStorage",
        async get(key) {
          return globalRef.localStorage.getItem(key);
        },
        async set(key, value) {
          globalRef.localStorage.setItem(key, value);
        }
      });
    }
    if (storageOption && typeof storageOption.get === "function" && typeof storageOption.set === "function") {
      return Object.freeze({
        type: storageOption.type || `custom:${namespace}`,
        get: storageOption.get.bind(storageOption),
        set: storageOption.set.bind(storageOption)
      });
    }
    throw new TypeError('storage must be false, "local", or an object with get/set methods.');
  }
  async function updateStorageState(storage, key, visitorId, createdAt) {
    if (!storage || !visitorId) {
      return Object.freeze({ enabled: Boolean(storage), status: visitorId ? "disabled" : "skipped" });
    }
    try {
      const previousRaw = await storage.get(key);
      const previous = previousRaw ? JSON.parse(previousRaw) : null;
      const next = {
        visitorId,
        firstSeenAt: previous && previous.visitorId === visitorId ? previous.firstSeenAt : createdAt,
        lastSeenAt: createdAt,
        seenCount: previous && previous.visitorId === visitorId ? Number(previous.seenCount || 0) + 1 : 1
      };
      await storage.set(key, JSON.stringify(next));
      return Object.freeze({
        enabled: true,
        type: storage.type,
        status: previous && previous.visitorId === visitorId ? "updated" : "created",
        firstSeenAt: next.firstSeenAt,
        seenCount: next.seenCount
      });
    } catch (error) {
      return Object.freeze({
        enabled: true,
        type: storage.type,
        status: "error",
        error: normalizeError(error)
      });
    }
  }
  function canUseStorage(globalRef, key) {
    try {
      const storage = globalRef && globalRef[key];
      if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
        return false;
      }
      const testKey = "__fingerprint_framework_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (_error) {
      return false;
    }
  }

  // src/collectors/privacy-mode.js
  var LOW_QUOTA_BYTES = 120 * 1024 * 1024;
  function createPrivacyModeCollector() {
    return createCollector({
      id: "browser.privacyMode",
      version: "1",
      category: "privacy",
      sensitivity: "medium",
      mode: "active",
      stability: "volatile",
      weight: 0.85,
      hashable: false,
      async collect(context) {
        const globalRef = context.global || {};
        const navigatorRef = context.navigator || {};
        if (isNodeLikeRuntime(globalRef, context.document)) {
          return createResult("unsupported", 0, [], [], "Private-mode indicators are browser-only.");
        }
        const storageRef = navigatorRef.storage || null;
        const localStorage = probeWebStorage(globalRef, "localStorage", 0.2);
        const sessionStorage = probeWebStorage(globalRef, "sessionStorage", 0.15);
        const indexedDB = await probeIndexedDb(globalRef);
        const estimate = await probeStorageEstimate(storageRef);
        const persisted = await probePersistedStorage(storageRef);
        const checks = [
          localStorage,
          sessionStorage,
          createCheck2("indexedDB.blocked", indexedDB.blocked, 0.25, indexedDB.detail),
          createCheck2("storage.lowQuota", estimate.lowQuota, 0.2, estimate.detail),
          createCheck2("storage.notPersisted", persisted.notPersisted, 0.05, persisted.detail)
        ];
        const score = roundScore2(checks.reduce((total, check) => total + (check.matched ? check.weight : 0), 0));
        const evidence = checks.filter((check) => check.matched).map((check) => check.name);
        return createResult(
          score >= 0.5 ? "likely_private" : score >= 0.25 ? "possible_private" : "no_private_evidence",
          score,
          evidence,
          checks,
          "No browser exposes a universal private-mode flag; this component reports conservative indicators only."
        );
      }
    });
  }
  function createResult(verdict, score, evidence, checks, note) {
    return {
      verdict,
      score,
      confidence: score >= 0.5 ? "medium" : score >= 0.25 ? "low" : "none",
      evidence,
      checks,
      note
    };
  }
  function isNodeLikeRuntime(globalRef, documentRef) {
    return Boolean(!documentRef && globalRef && globalRef.process && globalRef.process.versions && globalRef.process.versions.node);
  }
  function probeWebStorage(globalRef, key, weight) {
    return createCheck2(`${key}.blocked`, !canUseStorage(globalRef, key), weight, null);
  }
  function probeIndexedDb(globalRef) {
    const indexedDB = globalRef && globalRef.indexedDB;
    if (!indexedDB || typeof indexedDB.open !== "function") {
      return Promise.resolve({ blocked: true, detail: "missing" });
    }
    try {
      const request = indexedDB.open("__fingerprint_framework_privacy_probe__", 1);
      if (!request || typeof request !== "object") {
        return Promise.resolve({ blocked: false, detail: "unknown" });
      }
      return new Promise((resolve) => {
        let finished = false;
        const finish = (blocked, detail) => {
          if (finished) {
            return;
          }
          finished = true;
          resolve({ blocked, detail });
        };
        request.onerror = () => finish(true, "error");
        request.onblocked = () => finish(true, "blocked");
        request.onsuccess = () => {
          closeDatabase(request.result);
          deleteDatabase(indexedDB);
          finish(false, "available");
        };
      });
    } catch (_error) {
      return Promise.resolve({ blocked: true, detail: "exception" });
    }
  }
  async function probeStorageEstimate(storageRef) {
    if (!storageRef || typeof storageRef.estimate !== "function") {
      return { lowQuota: false, detail: null };
    }
    try {
      const estimate = await storageRef.estimate();
      const quota = safeNumber(estimate && estimate.quota);
      return {
        lowQuota: quota !== null && quota > 0 && quota < LOW_QUOTA_BYTES,
        detail: { quota, usage: safeNumber(estimate && estimate.usage) }
      };
    } catch (_error) {
      return { lowQuota: false, detail: "unavailable" };
    }
  }
  async function probePersistedStorage(storageRef) {
    if (!storageRef || typeof storageRef.persisted !== "function") {
      return { notPersisted: false, detail: null };
    }
    try {
      const persisted = await storageRef.persisted();
      return { notPersisted: persisted === false, detail: Boolean(persisted) };
    } catch (_error) {
      return { notPersisted: false, detail: "unavailable" };
    }
  }
  function createCheck2(name, matched, weight, detail) {
    return {
      name,
      matched: Boolean(matched),
      weight,
      detail
    };
  }
  function closeDatabase(database) {
    if (database && typeof database.close === "function") {
      database.close();
    }
  }
  function deleteDatabase(indexedDB) {
    if (typeof indexedDB.deleteDatabase === "function") {
      indexedDB.deleteDatabase("__fingerprint_framework_privacy_probe__");
    }
  }
  function roundScore2(value) {
    return Math.round(Math.min(1, value) * 1e3) / 1e3;
  }

  // src/collectors/runtime.js
  var HIGH_ENTROPY_HINTS = Object.freeze([
    "architecture",
    "bitness",
    "model",
    "platformVersion",
    "uaFullVersion",
    "fullVersionList",
    "wow64"
  ]);
  function createBrowserRuntimeCollector() {
    return createCollector({
      id: "runtime.browser",
      version: "2",
      category: "runtime",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
      weight: 1.4,
      collect(context) {
        const navigatorRef = context.navigator;
        if (!navigatorRef) {
          return null;
        }
        const userAgentData = navigatorRef.userAgentData ? {
          brands: normalizeBrands(navigatorRef.userAgentData.brands),
          mobile: Boolean(navigatorRef.userAgentData.mobile),
          platform: navigatorRef.userAgentData.platform || null
        } : null;
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
  function createClientHintsCollector() {
    return createCollector({
      id: "runtime.clientHints",
      version: "1",
      category: "runtime",
      sensitivity: "medium",
      mode: "passive",
      stability: "stable",
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
        if (typeof uaData.getHighEntropyValues !== "function") {
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
            error: error && error.message ? String(error.message) : "client_hints_unavailable"
          };
        }
      }
    });
  }
  function createNavigatorPropertiesCollector() {
    return createCollector({
      id: "runtime.navigatorProperties",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.45,
      collect(context) {
        const navigatorRef = context.navigator;
        if (!navigatorRef) {
          return null;
        }
        return {
          vendor: safeString(navigatorRef.vendor),
          vendorSub: safeString(navigatorRef.vendorSub),
          product: safeString(navigatorRef.product),
          productSub: safeString(navigatorRef.productSub),
          oscpu: safeString(navigatorRef.oscpu),
          cpuClass: safeString(navigatorRef.cpuClass),
          buildId: safeString(navigatorRef.buildID || navigatorRef.buildId)
        };
      }
    });
  }
  function createNodeRuntimeCollector() {
    return createCollector({
      id: "runtime.node",
      version: "1",
      category: "runtime",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.4,
      collect(context = {}) {
        const processRef = context.global && Object.prototype.hasOwnProperty.call(context.global, "process") ? context.global.process : getGlobal().process;
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
      wow64: typeof (value && value.wow64) === "boolean" ? value.wow64 : null
    };
  }

  // src/collectors/storage-signals.js
  function createStorageCapabilitiesCollector() {
    return createCollector({
      id: "storage.capabilities",
      version: "2",
      category: "storage",
      sensitivity: "low",
      mode: "passive",
      stability: "stable",
      weight: 0.65,
      hashable: false,
      collect(context) {
        const navigatorRef = context.navigator;
        const globalRef = context.global;
        return {
          cookieEnabled: navigatorRef ? Boolean(navigatorRef.cookieEnabled) : null,
          doNotTrack: navigatorRef ? navigatorRef.doNotTrack || null : null,
          indexedDB: hasFeature(globalRef, "indexedDB"),
          localStorage: canUseStorage(globalRef, "localStorage"),
          openDatabase: typeof globalRef.openDatabase === "function",
          sessionStorage: canUseStorage(globalRef, "sessionStorage")
        };
      }
    });
  }
  function hasFeature(globalRef, key) {
    try {
      return Boolean(globalRef[key]);
    } catch (_error) {
      return true;
    }
  }

  // src/collectors/tamper-evidence.js
  function createTamperEvidenceCollector() {
    return createCollector({
      id: "browser.tamperEvidence",
      version: "1",
      category: "risk",
      sensitivity: "medium",
      mode: "passive",
      stability: "volatile",
      weight: 0.9,
      hashable: false,
      collect(context) {
        return evaluateTamperEvidence(context);
      }
    });
  }
  function evaluateTamperEvidence(context = {}) {
    const windowRef = getWindowRef(context);
    const navigatorRef = context.navigator || windowRef.navigator || null;
    const documentRef = context.document || windowRef.document || null;
    const screenRef = context.screen || windowRef.screen || null;
    const evidence = [];
    if (!isNativeFunction(Function.prototype.toString)) {
      addEvidence(evidence, "function_to_string_patched", "high", "Function.prototype.toString does not look native.");
    }
    if (navigatorRef && navigatorRef.webdriver === true) {
      addEvidence(evidence, "webdriver_enabled", "high", "navigator.webdriver is true.");
    }
    const permissionsQuery = navigatorRef && navigatorRef.permissions && navigatorRef.permissions.query;
    if (permissionsQuery && !isNativeFunction(permissionsQuery)) {
      addEvidence(evidence, "permissions_query_patched", "medium", "navigator.permissions.query does not look native.");
    }
    const userAgent = String(navigatorRef && navigatorRef.userAgent || "");
    const platform = String(navigatorRef && navigatorRef.platform || "");
    const uaPlatform = String(navigatorRef && navigatorRef.userAgentData && navigatorRef.userAgentData.platform || "");
    if (uaPlatform && platform && uaPlatform !== platform && !isCompatiblePlatform(platform, uaPlatform)) {
      addEvidence(evidence, "platform_mismatch", "medium", "navigator.platform and userAgentData.platform disagree.", { platform, userAgentDataPlatform: uaPlatform });
    }
    if (/Android/u.test(userAgent) && uaPlatform && uaPlatform !== "Android") {
      addEvidence(evidence, "android_client_hint_mismatch", "medium", "Android user agent disagrees with client hints platform.", { userAgentDataPlatform: uaPlatform });
    }
    if (navigatorRef && Array.isArray(navigatorRef.languages) && navigatorRef.language && !navigatorRef.languages.includes(navigatorRef.language)) {
      addEvidence(evidence, "language_mismatch", "low", "navigator.language is absent from navigator.languages.");
    }
    const pluginLength = safeNumber(navigatorRef && navigatorRef.plugins && navigatorRef.plugins.length);
    if (/Chrome\/|Chromium\/|Edg\//u.test(userAgent) && pluginLength === 0) {
      addEvidence(evidence, "chromium_empty_plugins", "low", "Chromium-like browser reports an empty plugin list.");
    }
    const screenWidth = safeNumber(screenRef && screenRef.width);
    const screenHeight = safeNumber(screenRef && screenRef.height);
    if (screenWidth === 0 || screenHeight === 0) {
      addEvidence(evidence, "zero_screen", "medium", "Screen dimensions contain zero values.");
    }
    const canvasToDataUrl = getCanvasToDataUrl(documentRef);
    if (canvasToDataUrl && !isNativeFunction(canvasToDataUrl)) {
      addEvidence(evidence, "canvas_to_data_url_patched", "medium", "Canvas toDataURL does not look native.");
    }
    const score = calculateTamperScore(evidence);
    return Object.freeze({
      verdict: score >= 0.7 ? "tampered" : score >= 0.3 ? "suspicious" : "clean",
      score,
      confidence: evidence.some((item) => item.severity === "high") ? "high" : evidence.length > 0 ? "medium" : "low",
      evidence: Object.freeze(evidence)
    });
  }
  function addEvidence(evidence, code, severity, message, detail = null) {
    evidence.push(Object.freeze({ code, severity, message, detail }));
  }
  function calculateTamperScore(evidence) {
    const total = evidence.reduce((score, item) => score + severityWeight(item.severity), 0);
    return Math.min(1, Math.round(total * 1e3) / 1e3);
  }
  function severityWeight(severity) {
    return severity === "high" ? 0.45 : severity === "medium" ? 0.25 : 0.1;
  }
  function isNativeFunction(value) {
    if (typeof value !== "function") {
      return false;
    }
    try {
      return /\[native code\]/u.test(Function.prototype.toString.call(value));
    } catch (_error) {
      return false;
    }
  }
  function isCompatiblePlatform(platform, uaPlatform) {
    return platform.startsWith("Win") && uaPlatform === "Windows" || platform.startsWith("Mac") && uaPlatform === "macOS" || platform.startsWith("Linux") && uaPlatform === "Linux";
  }
  function getCanvasToDataUrl(documentRef) {
    if (!documentRef || typeof documentRef.createElement !== "function") {
      return null;
    }
    try {
      const canvas = documentRef.createElement("canvas");
      return canvas && canvas.toDataURL ? canvas.toDataURL : null;
    } catch (_error) {
      return null;
    }
  }

  // src/collectors/defaults.js
  function createDefaultCollectors() {
    return [
      createBrowserRuntimeCollector(),
      createClientHintsCollector(),
      createNavigatorPropertiesCollector(),
      createNodeRuntimeCollector(),
      createLocaleCollector(),
      createDateTimeLocaleCollector(),
      createTimezoneCollector(),
      createScreenCollector(),
      createScreenFrameCollector(),
      createMediaPreferencesCollector(),
      createHardwareCollector(),
      createTouchSupportCollector(),
      createArchitectureCollector(),
      createStorageCapabilitiesCollector(),
      createBotDetectionCollector(),
      createPrivacyModeCollector(),
      createTamperEvidenceCollector(),
      createApiFeaturesCollector(),
      createCssFeaturesCollector(),
      createNetworkConnectionCollector(),
      createPerformanceMemoryCollector(),
      createPluginsCollector(),
      createVendorFlavorsCollector(),
      createPdfViewerCollector(),
      createApplePayCollector(),
      createPrivateClickMeasurementCollector(),
      createMathCollector(),
      createDomBlockersCollector(),
      createFontsCollector(),
      createFontPreferencesCollector(),
      createAudioBaseLatencyCollector(),
      createAudioCollector(),
      createWebglCollector(),
      createWebglExtensionsCollector(),
      createWebglPrecisionCollector(),
      createCanvasCollector()
    ];
  }
  function createBrowserCollectorPack() {
    return createDefaultCollectors().filter((collector) => collector.id !== "runtime.node");
  }

  // src/policy.js
  function createPolicy(profile = "balanced", overrides = {}) {
    if (!PROFILE_PRESETS[profile]) {
      throw new TypeError(`Unknown privacy profile: ${profile}`);
    }
    const preset = PROFILE_PRESETS[profile];
    const maxSensitivity = overrides.maxSensitivity || preset.maxSensitivity;
    if (!SENSITIVITY_RANK[maxSensitivity]) {
      throw new TypeError(`Unknown sensitivity: ${maxSensitivity}`);
    }
    return Object.freeze({
      profile,
      requireConsent: Boolean(overrides.requireConsent),
      redactValues: Boolean(overrides.redactValues),
      maxSensitivity,
      includeActive: typeof overrides.includeActive === "boolean" ? overrides.includeActive : preset.includeActive,
      includeUnstable: typeof overrides.includeUnstable === "boolean" ? overrides.includeUnstable : preset.includeUnstable,
      allowCollectors: toFrozenSet(overrides.allowCollectors),
      denyCollectors: toFrozenSet(overrides.denyCollectors),
      allowCategories: toFrozenSet(overrides.allowCategories),
      denyCategories: toFrozenSet(overrides.denyCategories)
    });
  }
  function isCollectorAllowed(collector, policy) {
    if (policy.denyCollectors.has(collector.id)) {
      return false;
    }
    if (policy.allowCollectors.size > 0 && !policy.allowCollectors.has(collector.id)) {
      return false;
    }
    if (policy.denyCategories.has(collector.category)) {
      return false;
    }
    if (policy.allowCategories.size > 0 && !policy.allowCategories.has(collector.category)) {
      return false;
    }
    if (SENSITIVITY_RANK[collector.sensitivity] > SENSITIVITY_RANK[policy.maxSensitivity]) {
      return false;
    }
    if (collector.mode === "active" && !policy.includeActive) {
      return false;
    }
    if (collector.stability === "volatile" && !policy.includeUnstable) {
      return false;
    }
    return true;
  }
  function toFrozenSet(value) {
    if (!value) {
      return Object.freeze(/* @__PURE__ */ new Set());
    }
    if (!Array.isArray(value)) {
      throw new TypeError("Policy allow/deny lists must be arrays.");
    }
    return Object.freeze(new Set(value.map(String)));
  }

  // src/components.js
  function normalizeCollectors(collectors) {
    if (!Array.isArray(collectors)) {
      throw new TypeError("collectors must be an array.");
    }
    const seen = /* @__PURE__ */ new Set();
    return collectors.map((collector) => {
      const normalized = collector && typeof collector.collect === "function" && collector.id ? createCollector(collector) : createCollector(collector);
      if (seen.has(normalized.id)) {
        throw new TypeError(`Duplicate collector id: ${normalized.id}`);
      }
      seen.add(normalized.id);
      return normalized;
    });
  }
  async function prepareCollectors(collectors, policy, runtime, timeoutMs) {
    const allowed = collectors.filter((collector) => collector.prepare && isCollectorAllowed(collector, policy));
    const preparedValues = /* @__PURE__ */ new Map();
    const passiveCollectors = allowed.filter((collector) => collector.mode !== "active");
    const activeCollectors = allowed.filter((collector) => collector.mode === "active");
    const passiveValues = await Promise.all(passiveCollectors.map((collector) => prepareOneCollector(collector, runtime, timeoutMs)));
    for (let index = 0; index < passiveCollectors.length; index += 1) {
      if (passiveValues[index].ok) {
        preparedValues.set(passiveCollectors[index].id, passiveValues[index].value);
      }
    }
    for (const collector of activeCollectors) {
      const prepared = await prepareOneCollector(collector, runtime, timeoutMs);
      if (prepared.ok) {
        preparedValues.set(collector.id, prepared.value);
      }
    }
    return preparedValues;
  }
  async function collectPreparedComponents(collectors, policy, runtime, timeoutMs, preparedValues) {
    const skipped = [];
    const allowed = [];
    for (const collector of collectors) {
      if (!isCollectorAllowed(collector, policy)) {
        skipped.push(createSkippedComponent(collector, "policy_denied"));
      } else {
        allowed.push(collector);
      }
    }
    const passiveCollectors = allowed.filter((collector) => collector.mode !== "active");
    const activeCollectors = allowed.filter((collector) => collector.mode === "active");
    const passiveComponents = await Promise.all(
      passiveCollectors.map((collector) => collectOneComponent(collector, runtime, timeoutMs, preparedValues))
    );
    const activeComponents = [];
    for (const collector of activeCollectors) {
      activeComponents.push(await collectOneComponent(collector, runtime, timeoutMs, preparedValues));
    }
    const components = skipped.concat(passiveComponents, activeComponents);
    return components.sort((left, right) => left.id.localeCompare(right.id));
  }
  function redactComponent(component, policy) {
    if (!policy.redactValues || component.status !== "ok") {
      return component;
    }
    return Object.freeze({
      ...component,
      value: "[redacted]"
    });
  }
  async function collectOneComponent(collector, runtime, timeoutMs, preparedValues) {
    const startedAt = nowMs();
    try {
      const hasPrepared = preparedValues instanceof Map && preparedValues.has(collector.id);
      const prepared = hasPrepared ? preparedValues.get(collector.id) : void 0;
      const value = await withTimeout(Promise.resolve().then(() => collector.collect(runtime, prepared)), timeoutMs, collector.id);
      const canonicalValue = toCanonical(value);
      const status = canonicalValue === null ? "empty" : "ok";
      return freezeComponent({
        id: collector.id,
        version: collector.version,
        category: collector.category,
        sensitivity: collector.sensitivity,
        mode: collector.mode,
        stability: collector.stability,
        weight: collector.weight,
        hashable: collector.hashable,
        status,
        value: canonicalValue,
        durationMs: elapsedSince(startedAt),
        error: null
      });
    } catch (error) {
      return freezeComponent({
        id: collector.id,
        version: collector.version,
        category: collector.category,
        sensitivity: collector.sensitivity,
        mode: collector.mode,
        stability: collector.stability,
        weight: collector.weight,
        hashable: collector.hashable,
        status: error && error.code === "collector_timeout" ? "timeout" : "error",
        value: null,
        durationMs: elapsedSince(startedAt),
        error: normalizeError(error)
      });
    }
  }
  async function prepareOneCollector(collector, runtime, timeoutMs) {
    try {
      const value = await withTimeout(Promise.resolve().then(() => collector.prepare(runtime)), timeoutMs, `${collector.id}:prepare`);
      return Object.freeze({ ok: true, value });
    } catch (_error) {
      return Object.freeze({ ok: false, value: void 0 });
    }
  }
  function createSkippedComponent(collector, reason) {
    return freezeComponent({
      id: collector.id,
      version: collector.version,
      category: collector.category,
      sensitivity: collector.sensitivity,
      mode: collector.mode,
      stability: collector.stability,
      weight: collector.weight,
      hashable: collector.hashable,
      status: "skipped",
      value: null,
      durationMs: 0,
      error: Object.freeze({ code: reason, message: reason })
    });
  }
  function freezeComponent(component) {
    return Object.freeze({
      id: component.id,
      version: component.version,
      category: component.category,
      sensitivity: component.sensitivity,
      mode: component.mode,
      stability: component.stability,
      weight: component.weight,
      hashable: component.hashable,
      status: component.status,
      value: component.value,
      durationMs: component.durationMs,
      error: component.error
    });
  }
  function withTimeout(promise, timeoutMs, collectorId) {
    const globalRef = getGlobal();
    const setTimer = globalRef.setTimeout;
    const clearTimer = globalRef.clearTimeout;
    if (!timeoutMs || typeof setTimer !== "function" || typeof clearTimer !== "function") {
      return promise;
    }
    let timeoutId;
    const timeout = new Promise((_resolve, reject) => {
      timeoutId = setTimer(() => {
        const error = new Error(`Collector timed out: ${collectorId}`);
        error.code = "collector_timeout";
        reject(error);
      }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimer(timeoutId));
  }

  // src/confidence.js
  function createHashPayload(components, namespace, salt, identityOptions = {}) {
    const values = {};
    for (const component of selectIdentityComponents(components, identityOptions)) {
      values[component.id] = {
        version: component.version,
        value: component.value
      };
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      namespace,
      salt,
      values
    };
  }
  function selectIdentityComponents(components, identityOptions = {}) {
    const allowCollectors = toStringSet(identityOptions.allowCollectors);
    const denyCollectors = toStringSet(identityOptions.denyCollectors);
    const includeNonHashable = Boolean(identityOptions.includeNonHashable);
    return components.filter((component) => component && component.status === "ok" && (includeNonHashable || component.hashable !== false) && (allowCollectors.size === 0 || allowCollectors.has(component.id)) && !denyCollectors.has(component.id));
  }
  function calculateConfidence(components, collectors, policy, identityOptions = {}) {
    let possibleCollectionWeight = 0;
    let collectedCollectionWeight = 0;
    let possibleIdentityWeight = 0;
    let collectedIdentityWeight = 0;
    let identityEntropy = 0;
    const allowedCollectorIds = new Set(
      collectors.filter((collector) => isCollectorAllowed(collector, policy)).map((collector) => collector.id)
    );
    const identityCollectorIds = new Set(collectors.filter((collector) => allowedCollectorIds.has(collector.id) && isIdentityCollector(collector, identityOptions)).map((collector) => collector.id));
    for (const collector of collectors) {
      if (!allowedCollectorIds.has(collector.id)) {
        continue;
      }
      possibleCollectionWeight += collector.weight;
      if (identityCollectorIds.has(collector.id)) {
        possibleIdentityWeight += collector.weight;
      }
    }
    for (const component of components) {
      if (component.status !== "ok") {
        continue;
      }
      collectedCollectionWeight += component.weight;
      if (identityCollectorIds.has(component.id)) {
        collectedIdentityWeight += component.weight;
        identityEntropy += component.weight * SENSITIVITY_RANK[component.sensitivity];
      }
    }
    const collectionScore = possibleCollectionWeight > 0 ? round(clamp(collectedCollectionWeight / possibleCollectionWeight, 0, 1), 3) : 0;
    const completeness = possibleIdentityWeight > 0 ? clamp(collectedIdentityWeight / possibleIdentityWeight, 0, 1) : 0;
    const platformScore = estimatePlatformScore(components);
    const score = round(completeness * platformScore, 3);
    return Object.freeze({
      score,
      level: score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low",
      entropy: round(identityEntropy, 3),
      collectedWeight: round(collectedIdentityWeight, 3),
      possibleWeight: round(possibleIdentityWeight, 3),
      platformScore: round(platformScore, 3),
      collectionQuality: Object.freeze({
        score: collectionScore,
        level: collectionScore >= 0.75 ? "high" : collectionScore >= 0.45 ? "medium" : "low",
        collectedWeight: round(collectedCollectionWeight, 3),
        possibleWeight: round(possibleCollectionWeight, 3)
      })
    });
  }
  function isIdentityCollector(collector, identityOptions) {
    const allowCollectors = toStringSet(identityOptions.allowCollectors);
    const denyCollectors = toStringSet(identityOptions.denyCollectors);
    return (identityOptions.includeNonHashable || collector.hashable !== false) && (allowCollectors.size === 0 || allowCollectors.has(collector.id)) && !denyCollectors.has(collector.id);
  }
  function toStringSet(value) {
    return Object.freeze(new Set(Array.isArray(value) ? value.map(String) : []));
  }
  function estimatePlatformScore(components) {
    const runtime = components.find((component) => component.id === "runtime.browser" && component.status === "ok");
    const value = runtime && runtime.value && typeof runtime.value === "object" ? runtime.value : null;
    const userAgent = String(value && value.userAgent || "");
    const platform = String(value && value.platform || value && value.userAgentData && value.userAgentData.platform || "");
    if (!value) {
      return 1;
    }
    if (/Android/u.test(userAgent) || platform === "Android") {
      return 0.4;
    }
    if (/Safari\//u.test(userAgent) && !/Chrome\/|Chromium\/|Edg\//u.test(userAgent)) {
      return /Mac/u.test(platform) ? 0.5 : 0.3;
    }
    if (/^Win/u.test(platform)) {
      return 0.6;
    }
    if (/^Mac/u.test(platform)) {
      return 0.5;
    }
    return 0.7;
  }

  // src/crypto.js
  async function hashValue(value, runtime = {}) {
    const text = String(value);
    const bytes = encodeText(text);
    const cryptoRef = Object.prototype.hasOwnProperty.call(runtime, "crypto") ? runtime.crypto : getGlobal().crypto || null;
    if (cryptoRef && cryptoRef.subtle && typeof cryptoRef.subtle.digest === "function") {
      const digest = await cryptoRef.subtle.digest("SHA-256", bytes);
      return Object.freeze({ algorithm: "sha256:webcrypto", value: bytesToHex(new Uint8Array(digest)) });
    }
    try {
      const nodeCrypto = await importNodeCrypto(runtime);
      const value2 = nodeCrypto.createHash("sha256").update(text).digest("hex");
      return Object.freeze({ algorithm: "sha256:node", value: value2 });
    } catch (_error) {
      return Object.freeze({ algorithm: "fnv1a64:fallback", value: fnv1a64Hex(text) });
    }
  }
  function importNodeCrypto(runtime) {
    if (runtime && typeof runtime.importNodeCrypto === "function") {
      return runtime.importNodeCrypto();
    }
    return import("node:crypto");
  }
  function encodeText(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text);
    }
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      bytes[index] = text.charCodeAt(index) & 255;
    }
    return bytes;
  }
  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  function fnv1a64Hex(text) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= BigInt(text.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * prime);
    }
    return hash.toString(16).padStart(16, "0");
  }

  // src/debug.js
  function componentsToDebugString(components) {
    if (!Array.isArray(components)) {
      throw new TypeError("components must be an array.");
    }
    return components.map((component) => {
      const payload = component.status === "ok" ? canonicalStringify(component.value) : canonicalStringify(component.error);
      return `${component.id} [${component.status}] ${payload}`;
    }).join("\n");
  }

  // src/presets.js
  var USE_CASE_PRESETS = Object.freeze({
    "privacy-first": freezePreset({
      profile: "strict",
      policy: { requireConsent: true, redactValues: true },
      identity: { denyCollectors: ["browser.tamperEvidence", "browser.botDetection", "browser.privacyMode"] }
    }),
    "analytics-lite": freezePreset({
      profile: "balanced",
      policy: { includeActive: false, includeUnstable: false },
      identity: { denyCollectors: ["network.connection", "performance.memory"] }
    }),
    "login-risk": freezePreset({
      profile: "extended",
      policy: { includeActive: true, includeUnstable: true },
      identity: { denyCollectors: ["browser.tamperEvidence", "browser.botDetection", "browser.privacyMode"] }
    }),
    "checkout-risk": freezePreset({
      profile: "extended",
      policy: { includeActive: true, includeUnstable: true },
      identity: { denyCollectors: ["browser.applePay", "browser.privateClickMeasurement", "browser.domBlockers"] }
    }),
    "bot-defense": freezePreset({
      profile: "extended",
      policy: { includeActive: true, includeUnstable: true },
      identity: { denyCollectors: ["browser.tamperEvidence", "browser.botDetection"] }
    }),
    "fraud-defense": freezePreset({
      profile: "extended",
      policy: { includeActive: true, includeUnstable: true },
      identity: { includeNonHashable: false }
    })
  });
  function listUseCasePresets() {
    return Object.freeze(Object.keys(USE_CASE_PRESETS));
  }
  function createUseCasePreset(name, overrides = {}) {
    const preset = USE_CASE_PRESETS[String(name)];
    if (!preset) {
      throw new TypeError(`Unknown use-case preset: ${name}`);
    }
    return freezePreset({
      profile: overrides.profile || preset.profile,
      policy: { ...preset.policy, ...overrides.policy || {} },
      identity: { ...preset.identity, ...overrides.identity || {} }
    });
  }
  function freezePreset(preset) {
    return Object.freeze({
      profile: preset.profile,
      policy: Object.freeze({ ...preset.policy }),
      identity: Object.freeze({ ...preset.identity })
    });
  }

  // src/runtime.js
  function createRuntimeContext(options, context = {}) {
    const globalRef = context.global || getGlobal();
    return Object.freeze({
      global: globalRef,
      window: context.window || globalRef.window || globalRef,
      document: context.document || globalRef.document || null,
      navigator: context.navigator || globalRef.navigator || null,
      screen: context.screen || globalRef.screen || null,
      crypto: context.crypto || globalRef.crypto || null,
      consent: context.consent || options.consent || null,
      now: typeof context.now === "function" ? context.now : options.now
    });
  }
  function createRequestId(runtime) {
    const cryptoRef = runtime.crypto;
    if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
      return cryptoRef.randomUUID();
    }
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
  function hasConsent(consent) {
    if (consent === true) {
      return true;
    }
    if (!consent || typeof consent !== "object") {
      return false;
    }
    return consent.granted === true;
  }
  function defaultNamespace() {
    const globalRef = getGlobal();
    const locationRef = globalRef.location;
    if (locationRef && locationRef.hostname) {
      return locationRef.hostname;
    }
    return "default";
  }
  function waitForRuntimeIdle(globalRef, delayMs) {
    const runtimeGlobal = globalRef || getGlobal();
    const delay = Number.isFinite(delayMs) ? Math.max(0, Number(delayMs)) : 0;
    if (runtimeGlobal && typeof runtimeGlobal.requestIdleCallback === "function") {
      return new Promise((resolve) => {
        runtimeGlobal.requestIdleCallback(() => resolve(), { timeout: Math.max(delay * 2, 1) });
      });
    }
    const setTimer = runtimeGlobal && typeof runtimeGlobal.setTimeout === "function" ? runtimeGlobal.setTimeout.bind(runtimeGlobal) : getGlobal().setTimeout;
    if (typeof setTimer !== "function" || delay === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimer(resolve, delay));
  }

  // src/options.js
  function normalizeClientOptions(options) {
    const useCasePreset = options.useCase ? createUseCasePreset(options.useCase) : null;
    const profile = options.profile || useCasePreset && useCasePreset.profile || "balanced";
    if (!PROFILE_PRESETS[profile]) {
      throw new TypeError(`Unknown privacy profile: ${profile}`);
    }
    const namespace = String(options.namespace || defaultNamespace());
    const storage = resolveStorage(options.storage, namespace);
    return Object.freeze({
      profile,
      namespace,
      salt: String(options.salt || ""),
      collectorTimeoutMs: Number.isFinite(options.collectorTimeoutMs) ? Math.max(0, Number(options.collectorTimeoutMs)) : DEFAULT_COLLECTOR_TIMEOUT_MS,
      loadDelayMs: Number.isFinite(options.loadDelayMs) ? Math.max(0, Number(options.loadDelayMs)) : DEFAULT_LOAD_DELAY_MS,
      storage,
      storageKey: `fingerprintjs-botblocker:${namespace}:state`,
      policy: Object.freeze({ ...useCasePreset && useCasePreset.policy || {}, ...options.policy || {} }),
      identity: normalizeIdentityOptions({ ...useCasePreset && useCasePreset.identity || {}, ...options.identity || {} }),
      consent: options.consent || null,
      now: typeof options.now === "function" ? options.now : Date.now
    });
  }
  function normalizeIdentityOptions(identity) {
    return Object.freeze({
      includeNonHashable: Boolean(identity.includeNonHashable),
      allowCollectors: normalizeStringArray(identity.allowCollectors),
      denyCollectors: normalizeStringArray(identity.denyCollectors)
    });
  }
  function normalizeStringArray(value) {
    return Object.freeze(Array.isArray(value) ? value.map(String) : []);
  }

  // src/client.js
  function createClient(options = {}) {
    const clientOptions = normalizeClientOptions(options);
    const collectors = normalizeCollectors(options.collectors || createDefaultCollectors());
    const policy = createPolicy(clientOptions.profile, clientOptions.policy);
    const state = { preparedAt: null, preparedValues: /* @__PURE__ */ new Map() };
    const client = {
      version: VERSION,
      profile: clientOptions.profile,
      collectors: collectors.map((collector) => collector.id),
      get preparedAt() {
        return state.preparedAt;
      },
      async prepare(context = {}) {
        const runtime = createRuntimeContext(clientOptions, context);
        await waitForRuntimeIdle(runtime.global, clientOptions.loadDelayMs);
        if (policy.requireConsent && !hasConsent(runtime.consent)) {
          state.preparedValues = /* @__PURE__ */ new Map();
          state.preparedAt = new Date(runtime.now()).toISOString();
          return client;
        }
        state.preparedValues = await prepareCollectors(collectors, policy, runtime, clientOptions.collectorTimeoutMs);
        state.preparedAt = new Date(runtime.now()).toISOString();
        return client;
      },
      async get(context = {}) {
        return identifyWithCollectors(collectors, policy, clientOptions, context, state.preparedValues);
      },
      async identify(context = {}) {
        return identifyWithCollectors(collectors, policy, clientOptions, context, state.preparedValues);
      },
      async components(context = {}) {
        const runtime = createRuntimeContext(clientOptions, context);
        const collected = await collectPreparedComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs, state.preparedValues);
        return collected.map((component) => redactComponent(component, policy));
      },
      async debug(context = {}) {
        const components = await client.components(context);
        return componentsToDebugString(components);
      }
    };
    return Object.freeze(client);
  }
  async function identifyWithCollectors(collectors, policy, clientOptions, context, preparedValues) {
    const startedAt = nowMs();
    const runtime = createRuntimeContext(clientOptions, context);
    const requestId = createRequestId(runtime);
    const createdAt = new Date(runtime.now()).toISOString();
    if (policy.requireConsent && !hasConsent(runtime.consent)) {
      return createBlockedResult({
        requestId,
        createdAt,
        namespace: clientOptions.namespace,
        profile: clientOptions.profile,
        reason: "consent_required",
        durationMs: elapsedSince(startedAt)
      });
    }
    const components = await collectPreparedComponents(collectors, policy, runtime, clientOptions.collectorTimeoutMs, preparedValues);
    const identityComponents = selectIdentityComponents(components, clientOptions.identity);
    const payload = createHashPayload(components, clientOptions.namespace, clientOptions.salt, clientOptions.identity);
    const confidence = calculateConfidence(components, collectors, policy, clientOptions.identity);
    const okComponentCount = identityComponents.length;
    const hash = okComponentCount > 0 ? await hashValue(canonicalStringify(payload), runtime) : null;
    const visitorId = hash ? hash.value : null;
    const storage = await updateStorageState(clientOptions.storage, clientOptions.storageKey, visitorId, createdAt);
    return Object.freeze({
      visitorId,
      requestId,
      namespace: clientOptions.namespace,
      createdAt,
      confidence,
      components: components.map((component) => redactComponent(component, policy)),
      meta: Object.freeze({
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
        profile: clientOptions.profile,
        durationMs: elapsedSince(startedAt),
        hashAlgorithm: hash ? hash.algorithm : null,
        identityComponents: identityComponents.map((component) => component.id),
        reportOnlyComponents: components.filter((component) => component.status === "ok" && !identityComponents.includes(component)).map((component) => component.id),
        blocked: false,
        reason: null,
        storage
      })
    });
  }
  function createBlockedResult(details) {
    return Object.freeze({
      visitorId: null,
      requestId: details.requestId,
      namespace: details.namespace,
      createdAt: details.createdAt,
      confidence: Object.freeze({
        score: 0,
        level: "low",
        entropy: 0,
        collectedWeight: 0,
        possibleWeight: 0,
        platformScore: 0,
        collectionQuality: Object.freeze({
          score: 0,
          level: "low",
          collectedWeight: 0,
          possibleWeight: 0
        })
      }),
      components: Object.freeze([]),
      meta: Object.freeze({
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
        profile: details.profile,
        durationMs: details.durationMs,
        hashAlgorithm: null,
        identityComponents: Object.freeze([]),
        reportOnlyComponents: Object.freeze([]),
        blocked: true,
        reason: details.reason,
        storage: Object.freeze({ enabled: false, status: "skipped" })
      })
    });
  }

  // src/drift.js
  function createStabilityMonitor(options = {}) {
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
  function diffComponents(previousComponents = [], currentComponents = [], identityComponentIds = []) {
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
    if (!result || typeof result !== "object" || !Array.isArray(result.components)) {
      throw new TypeError("Stability monitor requires an IdentifyResult-like object.");
    }
  }
  function componentSignature(component) {
    return canonicalStringify({ status: component.status, version: component.version, value: component.value, error: component.error });
  }
  function unique(values) {
    return Array.from(new Set(values));
  }

  // src/hash-components.js
  async function hashComponents(components, options = {}, context = {}) {
    if (!Array.isArray(components)) {
      throw new TypeError("components must be an array.");
    }
    const namespace = String(options.namespace || "default");
    const salt = String(options.salt || "");
    const validComponents = components.filter((component) => component && typeof component === "object");
    const identityOptions = {
      includeNonHashable: Boolean(options.includeNonHashable),
      allowCollectors: options.allowCollectors,
      denyCollectors: options.denyCollectors
    };
    const identityComponents = selectIdentityComponents(validComponents, identityOptions);
    const okComponentCount = identityComponents.length;
    if (okComponentCount === 0) {
      return Object.freeze({ visitorId: null, hashAlgorithm: null, namespace });
    }
    const runtime = createRuntimeContext({ consent: null, now: Date.now }, context);
    const payload = createHashPayload(validComponents, namespace, salt, identityOptions);
    const hash = await hashValue(canonicalStringify(payload), runtime);
    return Object.freeze({ visitorId: hash.value, hashAlgorithm: hash.algorithm, namespace });
  }

  // src/loader.js
  async function loadClient(options = {}, context = {}) {
    const client = createClient(options);
    await client.prepare(context);
    return client;
  }

  // src/report.js
  function createExplainableReport(result, options = {}) {
    assertResult2(result);
    const identityComponents = new Set(result.meta && Array.isArray(result.meta.identityComponents) ? result.meta.identityComponents : []);
    const components = Object.freeze(result.components.map((component) => explainComponent(component, identityComponents, options)));
    const risk = buildRiskSummary(result.components);
    return Object.freeze({
      product: "FingerprintJS by BotBlocker",
      generatedAt: options.generatedAt || (/* @__PURE__ */ new Date()).toISOString(),
      identity: Object.freeze({
        visitorId: result.visitorId || null,
        namespace: result.namespace || "default",
        confidence: result.confidence,
        identityComponents: Object.freeze(Array.from(identityComponents)),
        reportOnlyComponents: Object.freeze(result.meta && Array.isArray(result.meta.reportOnlyComponents) ? result.meta.reportOnlyComponents.slice() : [])
      }),
      risk,
      summary: Object.freeze({
        total: result.components.length,
        ok: countStatus(result.components, "ok"),
        reportOnly: components.filter((component) => component.role === "report-only").length,
        identity: components.filter((component) => component.role === "identity").length,
        tamperVerdict: risk.tamper.verdict,
        botVerdict: risk.bot.verdict,
        privateModeVerdict: risk.privateMode.verdict
      }),
      components
    });
  }
  function explainComponent(component, identityComponents = [], options = {}) {
    const identitySet = identityComponents instanceof Set ? identityComponents : new Set(identityComponents);
    const role = identitySet.has(component.id) ? "identity" : "report-only";
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
  function assertResult2(result) {
    if (!result || typeof result !== "object" || !Array.isArray(result.components)) {
      throw new TypeError("Explainable report requires an IdentifyResult-like object.");
    }
  }
  function explainReason(component, role) {
    if (component.status !== "ok") {
      return `not_used_status_${component.status}`;
    }
    if (role === "identity") {
      return "stable_identity_input";
    }
    return component.hashable === false ? "report_only_collector" : "excluded_by_identity_policy";
  }
  function summarizeValue(value) {
    if (value === null) {
      return null;
    }
    if (Array.isArray(value)) {
      return Object.freeze({ type: "array", length: value.length });
    }
    if (typeof value === "object") {
      return Object.freeze({ type: "object", keys: Object.freeze(Object.keys(value).sort()) });
    }
    return Object.freeze({ type: typeof value, value });
  }
  function buildRiskSummary(components) {
    return Object.freeze({
      bot: pickRisk(components, "browser.botDetection"),
      privateMode: pickRisk(components, "browser.privacyMode"),
      tamper: pickRisk(components, "browser.tamperEvidence")
    });
  }
  function pickRisk(components, id) {
    const component = components.find((item) => item.id === id && item.status === "ok");
    const value = component && component.value && typeof component.value === "object" ? component.value : null;
    return Object.freeze({
      verdict: value && value.verdict ? value.verdict : "unavailable",
      score: value && Number.isFinite(value.score) ? value.score : null,
      confidence: value && value.confidence ? value.confidence : "none",
      evidence: Object.freeze(value && Array.isArray(value.evidence) ? value.evidence : [])
    });
  }
  function countStatus(components, status) {
    return components.filter((component) => component.status === status).length;
  }
  return __toCommonJS(index_exports);
})();
