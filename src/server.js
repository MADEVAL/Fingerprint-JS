import { canonicalStringify } from './canonical.js';
import { hashValue } from './crypto.js';
import { hashComponents } from './hash-components.js';
import { createExplainableReport } from './report.js';

export function createMemoryReplayStore() {
  const seen = new Map();
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

export async function createReplayToken(options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(1, Number(options.ttlMs)) : 120000;
  const payload = Object.freeze({
    version: 'bb-replay-v1',
    nonce: String(options.nonce || createNonce(context)),
    purpose: String(options.purpose || 'fingerprint-verification'),
    issuedAt: now,
    expiresAt: now + ttlMs
  });
  const signature = await signReplayPayload(payload, secret, context);
  return Object.freeze({ ...payload, signature: signature.value, algorithm: signature.algorithm });
}

export async function verifyReplayToken(token, options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  if (!token || typeof token !== 'object' || !token.nonce || !token.signature) {
    return replayResult(false, 'invalid_token');
  }

  if (Number(token.expiresAt) < now) {
    return replayResult(false, 'expired');
  }

  const payload = replayPayload(token);
  const expected = await signReplayPayload(payload, secret, context);
  if (expected.value !== token.signature) {
    return replayResult(false, 'bad_signature');
  }

  const store = options.store || null;
  if (store && await store.has(token.nonce, now)) {
    return replayResult(false, 'replayed');
  }

  if (store && typeof store.set === 'function') {
    await store.set(token.nonce, token.expiresAt);
  }

  return replayResult(true, 'accepted');
}

export async function createServerHash(result, options = {}, context = {}) {
  const secret = requireSecret(options.secret);
  assertResult(result);
  const namespace = String(options.namespace || result.namespace || 'default');
  const salt = `${String(options.salt || '')}:${secret}`;
  const hash = await hashComponents(result.components, {
    namespace,
    salt,
    includeNonHashable: Boolean(options.includeNonHashable),
    allowCollectors: options.allowCollectors,
    denyCollectors: options.denyCollectors
  }, context);

  return Object.freeze({
    mode: 'server_hash',
    visitorId: hash.visitorId,
    clientVisitorId: result.visitorId || null,
    namespace,
    hashAlgorithm: hash.hashAlgorithm
  });
}

export async function verifyFingerprintResult(result, options = {}, context = {}) {
  assertResult(result);
  const namespace = String(options.namespace || result.namespace || 'default');
  const clientHash = await hashComponents(result.components, { namespace, salt: String(options.clientSalt || '') }, context);
  const replay = options.replayToken
    ? await verifyReplayToken(options.replayToken, { secret: options.replaySecret || options.secret, store: options.replayStore, now: options.now }, context)
    : replayResult(true, 'not_checked');
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

export function createStaticNetworkAdapter(records = {}) {
  const map = new Map(Object.entries(records));
  return Object.freeze({
    lookup(subject) {
      return map.get(String(subject && subject.ip)) || null;
    }
  });
}

export async function evaluateNetworkRisk(subject = {}, options = {}) {
  const adapterData = options.adapter && typeof options.adapter.lookup === 'function'
    ? await options.adapter.lookup(subject)
    : typeof options.adapter === 'function'
      ? await options.adapter(subject)
      : null;
  const data = { ...(subject || {}), ...(adapterData || {}) };
  const evidence = [];
  addNetworkEvidence(evidence, data.tor, 'tor_exit_node', 0.5);
  addNetworkEvidence(evidence, data.vpn, 'vpn', 0.35);
  addNetworkEvidence(evidence, data.proxy, 'proxy', 0.35);
  addNetworkEvidence(evidence, data.datacenter || data.hosting, 'datacenter_or_hosting', 0.3);
  const score = Math.min(1, Math.round(evidence.reduce((total, item) => total + item.weight, 0) * 1000) / 1000);

  return Object.freeze({
    verdict: score >= 0.7 ? 'high_risk_network' : score >= 0.35 ? 'suspicious_network' : 'residential_or_unknown',
    score,
    ip: data.ip || null,
    asn: data.asn || null,
    country: data.country || null,
    evidence: Object.freeze(evidence)
  });
}

function requireSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    throw new TypeError('A non-empty server secret is required.');
  }

  return secret;
}

function assertResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.components)) {
    throw new TypeError('An IdentifyResult-like object is required.');
  }
}

function replayPayload(token) {
  return Object.freeze({
    version: String(token.version || 'bb-replay-v1'),
    nonce: String(token.nonce),
    purpose: String(token.purpose || 'fingerprint-verification'),
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
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
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