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
    version: "1",
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
        return { checked: baitElements.length, blocked };
      } finally {
        if (container.parentNode && typeof container.parentNode.removeChild === "function") {
          container.parentNode.removeChild(container);
        }
      }
    }
  });
}
function createBaitElements(documentRef) {
  const baits = [
    ["generic-ad", "ad adsbox advertisement banner_ad"],
    ["sponsor", "sponsor sponsored-link"],
    ["analytics", "tracking analytics pixel"]
  ];
  return baits.map(([name, className]) => {
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
  const safariMatch = /Version\/(\d+)/u.exec(userAgent);
  const samsungMatch = /SamsungBrowser\/(\d+)/u.exec(userAgent);
  const geckoMatch = /Gecko\//u.test(userAgent);
  const chromiumFromBrand = brandNames.some((name) => /Chromium|Google Chrome|Microsoft Edge/u.test(name));
  const chromiumFromUa = /Chrome\/|Chromium\/|CriOS\/|Edg\//u.test(userAgent);
  const isFirefox = Boolean(firefoxMatch);
  const isChromium = (chromiumFromBrand || chromiumFromUa) && !isFirefox;
  const isSafari = /Safari\//u.test(userAgent) && !isChromium && !/FxiOS\/|OPR\/|SamsungBrowser\//u.test(userAgent);
  const isWebKit = /AppleWebKit\//u.test(userAgent) || Boolean(windowRef.safari);
  const isIos = /iPad|iPhone|iPod/u.test(platform) || /iPad|iPhone|iPod/u.test(userAgent) || platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1;
  const isAndroid = /Android/u.test(userAgent) || uaPlatform === "Android";
  const safariMajor = safariMatch ? Number(safariMatch[1]) : null;
  const firefoxMajor = firefoxMatch ? Number(firefoxMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;
  const screenWidth = safeNumber2(screenRef && screenRef.width);
  const screenHeight = safeNumber2(screenRef && screenRef.height);
  const hardwareConcurrency = safeNumber2(navigatorRef && navigatorRef.hardwareConcurrency);
  return Object.freeze({
    engine: isFirefox ? "gecko" : isChromium ? "chromium" : isWebKit ? "webkit" : "unknown",
    isAndroid,
    isChromium,
    isFirefox,
    isFirefoxResistFingerprintingLikely: Boolean(isFirefox && hardwareConcurrency === 2 && screenWidth === 1e3 && screenHeight === 1e3),
    isIos,
    isIosDesktopMode: Boolean(platform === "MacIntel" && safeNumber2(navigatorRef && navigatorRef.maxTouchPoints) > 1),
    isSafari,
    isSafari17OrNewer: Boolean(isSafari && safariMajor !== null && safariMajor >= 17),
    isSamsungInternet: Boolean(samsungMatch || brandNames.some((name) => /Samsung Internet/u.test(name))),
    isWebKit,
    firefoxMajor,
    safariMajor,
    samsungMajor
  });
}
function shouldSuppressSignal(signal, quirks) {
  if (signal === "audio") {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }
  if (signal === "canvas") {
    return Boolean(quirks.isFirefoxResistFingerprintingLikely);
  }
  if (signal === "screen.frame") {
    return Boolean(quirks.isSafari17OrNewer || quirks.isFirefoxResistFingerprintingLikely);
  }
  if (signal === "hardware.concurrency") {
    return Boolean(quirks.isFirefoxResistFingerprintingLikely);
  }
  return false;
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

// src/collectors/display.js
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
      return {
        width: safeNumber(screenRef.width),
        height: safeNumber(screenRef.height),
        availWidth: safeNumber(screenRef.availWidth),
        availHeight: safeNumber(screenRef.availHeight),
        colorDepth: safeNumber(screenRef.colorDepth),
        pixelDepth: safeNumber(screenRef.pixelDepth),
        devicePixelRatio: safeNumber(context.global && context.global.devicePixelRatio)
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
        return { status: "suppressed", reason: "known_unstable_screen_frame" };
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
      return {
        outerWidth,
        outerHeight,
        innerWidth,
        innerHeight,
        left: safeNumber(windowRef.screenX ?? windowRef.screenLeft),
        top: safeNumber(windowRef.screenY ?? windowRef.screenTop),
        frameWidth: outerWidth !== null && innerWidth !== null ? Math.max(0, outerWidth - innerWidth) : null,
        frameHeight: outerHeight !== null && innerHeight !== null ? Math.max(0, outerHeight - innerHeight) : null,
        availDeltaWidth: safeNumber(screenRef.width) !== null && safeNumber(screenRef.availWidth) !== null ? Math.max(0, Number(screenRef.width) - Number(screenRef.availWidth)) : null,
        availDeltaHeight: safeNumber(screenRef.height) !== null && safeNumber(screenRef.availHeight) !== null ? Math.max(0, Number(screenRef.height) - Number(screenRef.availHeight)) : null
      };
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
    version: "1",
    category: "fonts",
    sensitivity: "high",
    mode: "active",
    stability: "volatile",
    weight: 1.1,
    collect(context) {
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
  });
}
function createFontPreferencesCollector() {
  return createCollector({
    id: "fonts.preferences",
    version: "1",
    category: "fonts",
    sensitivity: "medium",
    mode: "active",
    stability: "volatile",
    weight: 0.7,
    collect(context) {
      const documentRef = context.document;
      if (!canMeasure(documentRef)) {
        return null;
      }
      const container = createContainer(documentRef);
      try {
        documentRef.body.appendChild(container);
        const sizes = {};
        for (const family of BASE_FONTS) {
          const element = createSpan(documentRef, family, "mmmmmmmmmmlli", "72px");
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
        return { status: "suppressed", reason: "known_canvas_randomization" };
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
  return summarizeDataUrl(canvas.toDataURL());
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
  return summarizeDataUrl(canvas.toDataURL());
}
function resetCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}
function summarizeDataUrl(dataUrl) {
  return {
    length: dataUrl.length,
    checksum: checksumString(dataUrl)
  };
}

// src/collectors/hardware.js
function createHardwareCollector() {
  return createCollector({
    id: "hardware",
    version: "2",
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
        hardwareConcurrency: shouldSuppressSignal("hardware.concurrency", quirks) ? null : safeNumber(navigatorRef.hardwareConcurrency),
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
    version: "1",
    category: "media",
    sensitivity: "high",
    mode: "active",
    stability: "stable",
    weight: 1.2,
    async collect(context) {
      const quirks = detectBrowserQuirks(context);
      if (shouldSuppressSignal("audio", quirks)) {
        return { status: "suppressed", reason: "known_unstable_audio" };
      }
      const windowRef = getWindowRef(context);
      const OfflineAudioContext = windowRef.OfflineAudioContext || windowRef.webkitOfflineAudioContext;
      if (typeof OfflineAudioContext !== "function") {
        return { status: "unsupported" };
      }
      return renderAudio(OfflineAudioContext);
    }
  });
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
    createPluginsCollector(),
    createVendorFlavorsCollector(),
    createPdfViewerCollector(),
    createApplePayCollector(),
    createPrivateClickMeasurementCollector(),
    createMathCollector(),
    createDomBlockersCollector(),
    createFontsCollector(),
    createFontPreferencesCollector(),
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
  createBrowserCollectorPack,
  createCollector,
  createDefaultCollectors
};
