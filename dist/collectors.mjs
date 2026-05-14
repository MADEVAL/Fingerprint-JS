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

// src/collectors/defaults.js
function createDefaultCollectors() {
  return [
    createBrowserRuntimeCollector(),
    createNodeRuntimeCollector(),
    createLocaleCollector(),
    createTimezoneCollector(),
    createScreenCollector(),
    createHardwareCollector(),
    createStorageCapabilitiesCollector(),
    createWebglCollector(),
    createCanvasCollector()
  ];
}
function createBrowserCollectorPack() {
  return createDefaultCollectors().filter((collector) => collector.id !== "runtime.node");
}
function createBrowserRuntimeCollector() {
  return createCollector({
    id: "runtime.browser",
    version: "1",
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
        platform: navigatorRef.platform || null,
        vendor: navigatorRef.vendor || null,
        productSub: navigatorRef.productSub || null,
        webdriver: navigatorRef.webdriver === true,
        userAgentData
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
      const intlOptions = typeof Intl !== "undefined" && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions() : {};
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
    collect() {
      const intlOptions = typeof Intl !== "undefined" && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions() : {};
      return {
        timeZone: intlOptions.timeZone || null,
        offsetMinutes: (/* @__PURE__ */ new Date()).getTimezoneOffset()
      };
    }
  });
}
function createScreenCollector() {
  return createCollector({
    id: "screen.metrics",
    version: "1",
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
        devicePixelRatio: safeNumber(context.global.devicePixelRatio)
      };
    }
  });
}
function createHardwareCollector() {
  return createCollector({
    id: "hardware",
    version: "1",
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
      return {
        hardwareConcurrency: safeNumber(navigatorRef.hardwareConcurrency),
        deviceMemory: safeNumber(navigatorRef.deviceMemory),
        maxTouchPoints: safeNumber(navigatorRef.maxTouchPoints)
      };
    }
  });
}
function createStorageCapabilitiesCollector() {
  return createCollector({
    id: "storage.capabilities",
    version: "1",
    category: "storage",
    sensitivity: "low",
    mode: "passive",
    stability: "stable",
    weight: 0.5,
    collect(context) {
      const navigatorRef = context.navigator;
      return {
        cookieEnabled: navigatorRef ? Boolean(navigatorRef.cookieEnabled) : null,
        doNotTrack: navigatorRef ? navigatorRef.doNotTrack || null : null,
        localStorage: canUseStorage(context.global, "localStorage"),
        sessionStorage: canUseStorage(context.global, "sessionStorage")
      };
    }
  });
}
function createWebglCollector() {
  return createCollector({
    id: "webgl.renderer",
    version: "1",
    category: "graphics",
    sensitivity: "high",
    mode: "active",
    stability: "stable",
    weight: 1.6,
    collect(context) {
      const documentRef = context.document;
      if (!documentRef || typeof documentRef.createElement !== "function") {
        return null;
      }
      const canvas = documentRef.createElement("canvas");
      const gl = canvas.getContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
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
function createCanvasCollector() {
  return createCollector({
    id: "canvas.checksum",
    version: "1",
    category: "graphics",
    sensitivity: "high",
    mode: "active",
    stability: "stable",
    weight: 1.4,
    collect(context) {
      const documentRef = context.document;
      if (!documentRef || typeof documentRef.createElement !== "function") {
        return null;
      }
      const canvas = documentRef.createElement("canvas");
      canvas.width = 240;
      canvas.height = 80;
      const canvasContext = canvas.getContext && canvas.getContext("2d");
      if (!canvasContext || typeof canvas.toDataURL !== "function") {
        return null;
      }
      canvasContext.textBaseline = "top";
      canvasContext.font = "16px Arial";
      canvasContext.fillStyle = "#f60";
      canvasContext.fillRect(8, 8, 96, 28);
      canvasContext.fillStyle = "#069";
      canvasContext.fillText("Fingerprint Framework 0.1", 12, 14);
      canvasContext.globalCompositeOperation = "multiply";
      canvasContext.fillStyle = "rgba(102, 204, 0, 0.65)";
      canvasContext.beginPath();
      canvasContext.arc(80, 42, 24, 0, Math.PI * 2, true);
      canvasContext.closePath();
      canvasContext.fill();
      const dataUrl = canvas.toDataURL();
      return {
        length: dataUrl.length,
        checksum: checksumString(dataUrl)
      };
    }
  });
}
function normalizeBrands(brands) {
  if (!Array.isArray(brands)) {
    return [];
  }
  return brands.map((brand) => ({ brand: brand.brand || null, version: brand.version || null })).sort((left, right) => String(left.brand).localeCompare(String(right.brand)));
}
function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : null;
}
function getGlParameter(gl, parameter) {
  try {
    const value = gl.getParameter(parameter);
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
  } catch (_error) {
    return null;
  }
}
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
export {
  createBrowserCollectorPack,
  createCollector,
  createDefaultCollectors
};
