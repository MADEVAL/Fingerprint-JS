/* Fingerprint Framework v0.1.0 | MIT */

// src/constants.js
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
    collect(context) {
      const navigatorRef = context.navigator;
      const windowRef = getWindowRef(context);
      const userAgent = safeString(navigatorRef && navigatorRef.userAgent) || "";
      const plugins = navigatorRef ? toArrayLike(navigatorRef.plugins) : [];
      const mimeTypes = navigatorRef ? toArrayLike(navigatorRef.mimeTypes) : [];
      const languages = normalizeLanguages(navigatorRef && navigatorRef.languages);
      const automationGlobals = AUTOMATION_GLOBALS.filter((property) => property in windowRef).sort();
      const checks = [
        createCheck("navigator.webdriver", navigatorRef && navigatorRef.webdriver === true, 0.45, null),
        createCheck("automation.globals", automationGlobals.length > 0, 0.35, automationGlobals),
        createCheck("headless.userAgent", HEADLESS_UA_PATTERN.test(userAgent), 0.3, userAgent || null),
        createCheck("empty.languages", Boolean(navigatorRef && safeString(navigatorRef.language) && languages.length === 0), 0.1, null),
        createCheck("zero.outer.window", hasZeroOuterWindow(windowRef), 0.12, readWindowSize(windowRef)),
        createCheck("empty.chrome.plugins", isChromeLike(userAgent) && plugins.length === 0 && mimeTypes.length === 0, 0.08, null)
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

// src/collectors/browser-features.js
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
  const firefoxMatch = /Firefox\/(\d+)/u.exec(userAgent);
  const firefoxIosMatch = /FxiOS\/(\d+)/u.exec(userAgent);
  const safariMatch = /Version\/(\d+)/u.exec(userAgent);
  const samsungMatch = /SamsungBrowser\/(\d+)/u.exec(userAgent);
  const chromeMatch = /(?:Chrome|Chromium|CriOS)\/(\d+)/u.exec(userAgent);
  const chromiumFromBrand = brandNames.some((name) => /Chromium|Google Chrome|Microsoft Edge/u.test(name));
  const chromiumFromUa = /Chrome\/|Chromium\/|CriOS\/|Edg\//u.test(userAgent);
  const geckoFeature = "mozInnerScreenX" in windowRef || supportsCss(windowRef, "-moz-appearance", "none");
  const chromiumFeature = Boolean(windowRef.chrome && (windowRef.chrome.runtime || windowRef.chrome.loadTimes || windowRef.chrome.csi));
  const webKitFeature = "WebKitCSSMatrix" in windowRef || "webkitRequestAnimationFrame" in windowRef || supportsCss(windowRef, "-webkit-touch-callout", "none") || Boolean(windowRef.safari);
  const isFirefox = Boolean(firefoxMatch || geckoFeature) && !/Seamonkey\//u.test(userAgent);
  const isChromium = (chromiumFromBrand || chromiumFromUa || chromiumFeature) && !isFirefox;
  const isSafari = /Safari\//u.test(userAgent) && !isChromium && !/FxiOS\/|OPR\/|SamsungBrowser\//u.test(userAgent);
  const isWebKit = /AppleWebKit\//u.test(userAgent) || webKitFeature;
  const isIos = /iPad|iPhone|iPod/u.test(platform) || /iPad|iPhone|iPod/u.test(userAgent) || platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1;
  const isAndroid = /Android/u.test(userAgent) || uaPlatform === "Android";
  const safariMajor = safariMatch ? Number(safariMatch[1]) : null;
  const firefoxMajor = firefoxMatch ? Number(firefoxMatch[1]) : null;
  const firefoxIosMajor = firefoxIosMatch ? Number(firefoxIosMatch[1]) : null;
  const chromiumMajor = chromeMatch ? Number(chromeMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;
  const screenWidth = safeNumber2(screenRef && screenRef.width);
  const screenHeight = safeNumber2(screenRef && screenRef.height);
  const hardwareConcurrency = safeNumber2(navigatorRef && navigatorRef.hardwareConcurrency);
  return Object.freeze({
    engine: isFirefox ? "gecko" : isChromium ? "chromium" : isWebKit ? "webkit" : "unknown",
    isAndroid,
    isChromium,
    isFirefox,
    isFirefox120OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 120),
    isFirefox143OrNewer: Boolean(isFirefox && firefoxMajor !== null && firefoxMajor >= 143),
    isFirefoxResistFingerprintingLikely: Boolean(isFirefox && hardwareConcurrency === 2 && screenWidth === 1e3 && screenHeight === 1e3),
    isIos,
    isIosDesktopMode: Boolean(platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1),
    isOldMobileSafari: Boolean(isIos && isSafari && safariMajor !== null && safariMajor <= 11),
    isSafari,
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
function supportsCss(windowRef, property, value) {
  try {
    return Boolean(windowRef.CSS && typeof windowRef.CSS.supports === "function" && windowRef.CSS.supports(property, value));
  } catch (_error) {
    return false;
  }
}

// src/collectors/display.js
var cachedScreenFrame = null;
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
      const outerWidth = safeNumber(windowRef.outerWidth);
      const outerHeight = safeNumber(windowRef.outerHeight);
      const innerWidth = safeNumber(windowRef.innerWidth);
      const innerHeight = safeNumber(windowRef.innerHeight);
      const frame = {
        outerWidth,
        outerHeight,
        innerWidth,
        innerHeight,
        left: safeNumber(windowRef.screenX ?? windowRef.screenLeft),
        top: safeNumber(windowRef.screenY ?? windowRef.screenTop),
        frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
        frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
        availDeltaWidth: safeNumber(screenRef.width) !== null && safeNumber(screenRef.availWidth) !== null ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth)) : null,
        availDeltaHeight: safeNumber(screenRef.height) !== null && safeNumber(screenRef.availHeight) !== null ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight)) : null,
        fullscreen: isFullscreen(context),
        cached: false
      };
      if (!frame.fullscreen && hasUsableFrame(frame)) {
        cachedScreenFrame = Object.freeze({ ...frame });
      }
      if (!frame.fullscreen && isZeroFrame(frame) && cachedScreenFrame) {
        return { ...cachedScreenFrame, cached: true };
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

// src/collectors/fonts.js
var FONT_CANDIDATES = Object.freeze([
  "Arial",
  "Arial Unicode MS",
  "Calibri",
  "Cambria",
  "Courier New",
  "Georgia",
  "Helvetica Neue",
  "Menlo",
  "Roboto",
  "Segoe UI",
  "Times New Roman"
]);
var BASE_FONTS = Object.freeze(["monospace", "sans-serif", "serif"]);
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
  return withMeasurementDocument(documentRef, (measurementDocument) => {
    const container = createContainer(measurementDocument);
    try {
      measurementDocument.body.appendChild(container);
      const sizes = {};
      for (const family of BASE_FONTS) {
        const element = createSpan(measurementDocument, family, "mmmmmmmmmmlli", "72px");
        container.appendChild(element);
        sizes[family] = {
          width: safeNumber(element.offsetWidth),
          height: safeNumber(element.offsetHeight)
        };
      }
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
      const base = createSpan(documentRef, baseFont, "mmMwWLliI0O&1", "48px");
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
    const span = createSpan(documentRef, `"${font}",${baseFont}`, "mmMwWLliI0O&1", "48px");
    container.appendChild(span);
    const box = readBox(span);
    if (box.width !== baseMeasurements[baseFont].width || box.height !== baseMeasurements[baseFont].height) {
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
function readBox(element) {
  return {
    width: safeNumber(element.offsetWidth),
    height: safeNumber(element.offsetHeight)
  };
}
function removeNode(node) {
  if (node && node.parentNode && typeof node.parentNode.removeChild === "function") {
    node.parentNode.removeChild(node);
  }
}

// src/collectors/graphics.js
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
      const extensionList = Array.isArray(extensions) ? extensions.slice().sort() : [];
      return {
        extensions: extensionList,
        maxTextureSize: getGlParameter(gl, gl.MAX_TEXTURE_SIZE),
        maxCombinedTextureImageUnits: getGlParameter(gl, gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
        maxRenderbufferSize: getGlParameter(gl, gl.MAX_RENDERBUFFER_SIZE),
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
  canvasContext.fillText("Fingerprint Framework 0.1", 2, 18);
  canvasContext.fillStyle = "rgba(102, 204, 0, 0.65)";
  canvasContext.fillText("mwmw 12345", 4, 48);
  return summarizeCanvas(canvas);
}
function resetCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}
function summarizeCanvas(canvas) {
  try {
    const dataUrl = canvas.toDataURL();
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
  return renderAudio(OfflineAudioContext);
}
async function renderAudio(OfflineAudioContext) {
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
  const rendered = await resolveRenderedBuffer(audioContext);
  const samples = rendered && typeof rendered.getChannelData === "function" ? rendered.getChannelData(0) : new Float32Array(0);
  return {
    status: "ok",
    sampleRate: safeNumber(rendered && rendered.sampleRate) || sampleRate,
    length: safeNumber(rendered && rendered.length) || length,
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
function resolveRenderedBuffer(audioContext) {
  const rendered = audioContext.startRendering();
  if (rendered && typeof rendered.then === "function") {
    return rendered;
  }
  return new Promise((resolve, reject) => {
    audioContext.oncomplete = (event) => resolve(event.renderedBuffer);
    audioContext.onerror = reject;
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

// src/environment.js
function getGlobal() {
  return globalThis;
}

// src/storage.js
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
    createCanvasCollector()
  ];
}
function createBrowserCollectorPack() {
  return createDefaultCollectors().filter((collector) => collector.id !== "runtime.node");
}
export {
  createBotDetectionCollector,
  createBrowserCollectorPack,
  createCollector,
  createDefaultCollectors,
  createNavigatorPropertiesCollector,
  createPrivacyModeCollector
};
