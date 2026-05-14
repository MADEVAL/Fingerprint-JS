/* FingerprintJS by BotBlocker v0.1.0 | MIT | https://botblocker.top */
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/server.js
var server_exports = {};
__export(server_exports, {
  createMemoryReplayStore: () => createMemoryReplayStore,
  createReplayToken: () => createReplayToken,
  createServerHash: () => createServerHash,
  createStaticNetworkAdapter: () => createStaticNetworkAdapter,
  evaluateNetworkRisk: () => evaluateNetworkRisk,
  verifyFingerprintResult: () => verifyFingerprintResult,
  verifyReplayToken: () => verifyReplayToken
});
module.exports = __toCommonJS(server_exports);

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

// src/environment.js
function getGlobal() {
  return globalThis;
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

// src/constants.js
var SCHEMA_VERSION = "bbid-v2";
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
function toStringSet(value) {
  return Object.freeze(new Set(Array.isArray(value) ? value.map(String) : []));
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

// src/report.js
function createExplainableReport(result, options = {}) {
  assertResult(result);
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
function assertResult(result) {
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

// src/server.js
function createMemoryReplayStore() {
  const seen = /* @__PURE__ */ new Map();
  return Object.freeze({
    has(nonce, now = Date.now()) {
      cleanup(seen, now);
      return seen.has(String(nonce));
    },
    set(nonce, expiresAt) {
      seen.set(String(nonce), Number(expiresAt));
    },
    size(now = Date.now()) {
      cleanup(seen, now);
      return seen.size;
    }
  });
}
async function createReplayToken(options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(1, Number(options.ttlMs)) : 12e4;
  const payload = Object.freeze({
    version: "bb-replay-v1",
    nonce: String(options.nonce || createNonce(context)),
    purpose: String(options.purpose || "fingerprint-verification"),
    issuedAt: now,
    expiresAt: now + ttlMs
  });
  const signature = await signReplayPayload(payload, secret, context);
  return Object.freeze({ ...payload, signature: signature.value, algorithm: signature.algorithm });
}
async function verifyReplayToken(token, options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  if (!token || typeof token !== "object" || !token.nonce || !token.signature) {
    return replayResult(false, "invalid_token");
  }
  if (Number(token.expiresAt) < now) {
    return replayResult(false, "expired");
  }
  const payload = replayPayload(token);
  const expected = await signReplayPayload(payload, secret, context);
  if (expected.value !== token.signature) {
    return replayResult(false, "bad_signature");
  }
  const store = options.store || null;
  if (store && await store.has(token.nonce, now)) {
    return replayResult(false, "replayed");
  }
  if (store && typeof store.set === "function") {
    await store.set(token.nonce, token.expiresAt);
  }
  return replayResult(true, "accepted");
}
async function createServerHash(result, options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  assertResult2(result);
  const namespace = String(options.namespace || result.namespace || "default");
  const salt = `${String(options.salt || "")}:${secret}`;
  const hash = await hashComponents(result.components, {
    namespace,
    salt,
    includeNonHashable: Boolean(options.includeNonHashable),
    allowCollectors: options.allowCollectors,
    denyCollectors: options.denyCollectors
  }, context);
  return Object.freeze({
    mode: "server_hash",
    visitorId: hash.visitorId,
    clientVisitorId: result.visitorId || null,
    namespace,
    hashAlgorithm: hash.hashAlgorithm
  });
}
async function verifyFingerprintResult(result, options = {}, context = {}) {
  assertResult2(result);
  const namespace = String(options.namespace || result.namespace || "default");
  const clientHash = await hashComponents(result.components, { namespace, salt: String(options.clientSalt || "") }, context);
  const replay = options.replayToken ? await verifyReplayToken(options.replayToken, { secret: options.replaySecret || options.secret, store: options.replayStore, now: options.now }, context) : replayResult(true, "not_checked");
  const serverHash = options.secret ? await createServerHash(result, options, context) : null;
  const network = options.network ? await evaluateNetworkRisk(options.network, { adapter: options.networkAdapter }) : null;
  return Object.freeze({
    ok: clientHash.visitorId === result.visitorId && replay.ok,
    clientHashMatches: clientHash.visitorId === result.visitorId,
    clientHash,
    serverHash,
    replay,
    network,
    report: createExplainableReport(result, { generatedAt: options.generatedAt })
  });
}
function createStaticNetworkAdapter(records = {}) {
  const map = new Map(Object.entries(records));
  return Object.freeze({
    lookup(subject) {
      return map.get(String(subject && subject.ip)) || null;
    }
  });
}
async function evaluateNetworkRisk(subject = {}, options = {}) {
  const adapterData = options.adapter && typeof options.adapter.lookup === "function" ? await options.adapter.lookup(subject) : typeof options.adapter === "function" ? await options.adapter(subject) : null;
  const data = { ...subject || {}, ...adapterData || {} };
  const evidence = [];
  addNetworkEvidence(evidence, data.tor, "tor_exit_node", 0.5);
  addNetworkEvidence(evidence, data.vpn, "vpn", 0.35);
  addNetworkEvidence(evidence, data.proxy, "proxy", 0.35);
  addNetworkEvidence(evidence, data.datacenter || data.hosting, "datacenter_or_hosting", 0.3);
  const score = Math.min(1, Math.round(evidence.reduce((total, item) => total + item.weight, 0) * 1e3) / 1e3);
  return Object.freeze({
    verdict: score >= 0.7 ? "high_risk_network" : score >= 0.35 ? "suspicious_network" : "residential_or_unknown",
    score,
    ip: data.ip || null,
    asn: data.asn || null,
    country: data.country || null,
    evidence: Object.freeze(evidence)
  });
}
function requireSecret(secret) {
  if (!secret || typeof secret !== "string") {
    throw new TypeError("A non-empty server secret is required.");
  }
  return secret;
}
function assertResult2(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.components)) {
    throw new TypeError("An IdentifyResult-like object is required.");
  }
}
function replayPayload(token) {
  return Object.freeze({
    version: String(token.version || "bb-replay-v1"),
    nonce: String(token.nonce),
    purpose: String(token.purpose || "fingerprint-verification"),
    issuedAt: Number(token.issuedAt),
    expiresAt: Number(token.expiresAt)
  });
}
async function signReplayPayload(payload, secret, context) {
  return hashValue(canonicalStringify({ payload, secret }), context);
}
function replayResult(ok, status) {
  return Object.freeze({ ok, status });
}
function createNonce(context) {
  const cryptoRef = context.crypto || globalThis.crypto || null;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `nonce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function addNetworkEvidence(evidence, active, code, weight) {
  if (active === true) {
    evidence.push(Object.freeze({ code, weight }));
  }
}
function cleanup(store, now) {
  for (const [nonce, expiresAt] of store) {
    if (expiresAt < now) {
      store.delete(nonce);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMemoryReplayStore,
  createReplayToken,
  createServerHash,
  createStaticNetworkAdapter,
  evaluateNetworkRisk,
  verifyFingerprintResult,
  verifyReplayToken
});
