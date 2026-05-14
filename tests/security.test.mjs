import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  createCollector,
  createExplainableReport,
  createStabilityMonitor,
  createTamperEvidenceCollector,
  createUseCasePreset,
  diffComponents,
  explainComponent,
  listUseCasePresets
} from '../src/index.js';
import {
  createMemoryReplayStore,
  createReplayToken,
  createServerHash,
  createStaticNetworkAdapter,
  evaluateNetworkRisk,
  verifyFingerprintResult,
  verifyReplayToken
} from '../src/server.js';
import { evaluateTamperEvidence } from '../src/collectors/tamper-evidence.js';
import { normalizeClientOptions } from '../src/options.js';

test('tamper evidence collector reports clean, suspicious, and tampered environments', () => {
  const collector = createTamperEvidenceCollector();
  assert.equal(collector.hashable, false);
  assert.equal(collector.collect({}).verdict, 'clean');

  const suspicious = evaluateTamperEvidence({
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120 Safari/537.36',
      language: 'en-US',
      languages: ['fr-FR'],
      permissions: { query: {} }
    }
  });
  assert.equal(suspicious.verdict, 'suspicious');
  assert.ok(suspicious.evidence.some((item) => item.code === 'permissions_query_patched'));

  const tampered = evaluateTamperEvidence({
    navigator: {
      webdriver: true,
      userAgent: 'Mozilla/5.0 Android Chrome/120 Safari/537.36',
      platform: 'Win32',
      userAgentData: { platform: 'iOS' },
      language: 'en-US',
      languages: ['de-DE'],
      permissions: { query() {} },
      plugins: { length: 0 }
    },
    screen: { width: 0, height: 1000 },
    document: { createElement: () => ({ toDataURL() { return 'patched'; } }) }
  });
  assert.equal(tampered.verdict, 'tampered');
  assert.equal(tampered.confidence, 'high');
  assert.ok(tampered.evidence.some((item) => item.code === 'android_client_hint_mismatch'));
  assert.ok(tampered.evidence.some((item) => item.code === 'canvas_to_data_url_patched'));

  const throwingCanvas = evaluateTamperEvidence({ document: { createElement() { throw new Error('blocked'); } } });
  assert.equal(throwingCanvas.verdict, 'clean');
  const noToDataUrlCanvas = evaluateTamperEvidence({ document: { createElement: () => ({}) } });
  assert.equal(noToDataUrlCanvas.verdict, 'clean');

  const compatiblePlatforms = [
    ['Win32', 'Windows'],
    ['MacIntel', 'macOS'],
    ['Linux x86_64', 'Linux']
  ];
  for (const [platform, userAgentDataPlatform] of compatiblePlatforms) {
    const value = evaluateTamperEvidence({ navigator: { platform, userAgentData: { platform: userAgentDataPlatform } } });
    assert.equal(value.evidence.some((item) => item.code === 'platform_mismatch'), false);
  }
});

test('tamper evidence detects patched Function.prototype.toString safely', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');
  try {
    Object.defineProperty(Function.prototype, 'toString', {
      configurable: true,
      value() {
        throw new Error('patched');
      }
    });
    const value = evaluateTamperEvidence({});
    assert.ok(value.evidence.some((item) => item.code === 'function_to_string_patched'));
  } finally {
    Object.defineProperty(Function.prototype, 'toString', descriptor);
  }
});

test('stability monitor tracks identity and report-only drift', () => {
  const first = makeResult('aaa', [component('stable', 'ok', 'one', true), component('risk', 'ok', 1, false)], ['stable']);
  const second = makeResult('aaa', [component('stable', 'ok', 'one', true), component('risk', 'ok', 2, false), component('new.report', 'ok', true, false)], ['stable']);
  const third = makeResult('bbb', [component('stable', 'ok', 'two', true)], ['stable']);

  const monitor = createStabilityMonitor({ historyLimit: 2 });
  assert.throws(() => monitor.observe(null), /IdentifyResult-like/u);

  const initial = monitor.observe(first);
  assert.equal(initial.matchesBaseline, true);
  assert.deepEqual(initial.drift.identityChanged, ['stable']);

  const drift = monitor.observe(second);
  assert.deepEqual(drift.drift.identityChanged, []);
  assert.deepEqual(drift.drift.reportOnlyChanged, ['risk', 'new.report']);
  assert.deepEqual(drift.drift.added, ['new.report']);

  const changed = monitor.observe(third);
  assert.equal(changed.matchesBaseline, false);
  assert.equal(changed.history.length, 2);
  assert.deepEqual(changed.drift.removed.slice().sort(), ['new.report', 'risk']);
  assert.deepEqual(diffComponents([], [], null).identityChanged, []);
  assert.deepEqual(diffComponents([component('stable', 'ok', 'x', true)], [], ['stable']).identityChanged, ['stable']);

  const defaultMonitor = createStabilityMonitor();
  assert.equal(defaultMonitor.observe(first).runCount, 1);

  monitor.reset();
  assert.equal(monitor.snapshot().baselineVisitorId, null);
});

test('explainable report separates identity, report-only, and risk evidence', () => {
  const result = makeResult('id', [
    component('stable', 'ok', { stable: true }, true),
    component('policy.excluded', 'ok', { stable: false }, true),
    component('array.value', 'ok', [1, 2], false),
    component('primitive.value', 'ok', 'x', false),
    component('empty.value', 'empty', null, true),
    component('browser.tamperEvidence', 'ok', { verdict: 'tampered', score: 0.8, confidence: 'high', evidence: [{ code: 'patched' }] }, false),
    component('browser.botDetection', 'ok', { verdict: 'suspicious', score: 0.4, confidence: 'medium', evidence: [] }, false),
    component('browser.privacyMode', 'ok', { verdict: 'possible_private', score: 0.2, confidence: 'low', evidence: [] }, false)
  ], ['stable']);

  const report = createExplainableReport(result, { generatedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(report.generatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(report.summary.identity, 1);
  assert.equal(report.summary.reportOnly, 7);
  assert.equal(report.risk.tamper.verdict, 'tampered');
  assert.equal(report.components.find((item) => item.id === 'stable').reason, 'stable_identity_input');
  assert.equal(report.components.find((item) => item.id === 'policy.excluded').reason, 'excluded_by_identity_policy');
  assert.equal(report.components.find((item) => item.id === 'array.value').value.length, 2);
  assert.equal(report.components.find((item) => item.id === 'primitive.value').value.value, 'x');
  assert.equal(report.components.find((item) => item.id === 'empty.value').reason, 'not_used_status_empty');

  const withValues = explainComponent(result.components[0], new Set(['stable']), { includeValues: true });
  assert.deepEqual(withValues.value, { stable: true });
  assert.equal(explainComponent(result.components[0], ['stable']).role, 'identity');
  const minimalReport = createExplainableReport({ components: [], meta: {} });
  assert.equal(minimalReport.identity.visitorId, null);
  assert.equal(minimalReport.identity.namespace, 'default');
  assert.deepEqual(minimalReport.identity.identityComponents, []);
  assert.throws(() => createExplainableReport(null), /IdentifyResult-like/u);
});

test('use-case presets merge into client policy and identity options', async () => {
  assert.ok(listUseCasePresets().includes('bot-defense'));
  assert.equal(createUseCasePreset('checkout-risk', { profile: 'balanced', policy: { redactValues: true } }).policy.redactValues, true);
  assert.throws(() => createUseCasePreset('missing'), /Unknown use-case/u);

  const blocked = await createClient({
    useCase: 'privacy-first',
    collectors: [createCollector({ id: 'preset.signal', collect: () => 'ok' })]
  }).identify();
  assert.equal(blocked.meta.blocked, true);

  const allowed = await createClient({
    useCase: 'bot-defense',
    collectors: [
      createCollector({ id: 'preset.identity', collect: () => 'same' }),
      createCollector({ id: 'browser.botDetection', hashable: false, collect: () => ({ verdict: 'clean', score: 0 }) })
    ]
  }).identify({ consent: true });
  assert.deepEqual(allowed.meta.identityComponents, ['preset.identity']);
  assert.equal(normalizeClientOptions({}).profile, 'balanced');
  assert.equal(normalizeClientOptions({ useCase: 'login-risk' }).profile, 'extended');
  assert.equal(normalizeClientOptions({ identity: null }).identity.includeNonHashable, false);
});

test('replay protection signs, verifies, rejects replay, expiry, and bad signatures', async () => {
  await assert.rejects(() => createReplayToken({ secret: '' }), /server secret/u);
  const store = createMemoryReplayStore();
  const token = await createReplayToken({ secret: 'server-secret', nonce: 'nonce-1', now: 1000, ttlMs: 50, purpose: 'login' }, { importNodeCrypto: nullCryptoImport });

  assert.equal(token.nonce, 'nonce-1');
  assert.equal(store.size(1000), 0);
  assert.deepEqual(await verifyReplayToken(token, { secret: 'server-secret', store, now: 1020 }, { importNodeCrypto: nullCryptoImport }), { ok: true, status: 'accepted' });
  assert.deepEqual(await verifyReplayToken(token, { secret: 'server-secret', store, now: 1030 }, { importNodeCrypto: nullCryptoImport }), { ok: false, status: 'replayed' });
  assert.equal(store.size(1100), 0);
  assert.deepEqual(await verifyReplayToken({ ...token, nonce: 'nonce-2', signature: 'bad' }, { secret: 'server-secret', now: 1020 }, { importNodeCrypto: nullCryptoImport }), { ok: false, status: 'bad_signature' });
  assert.deepEqual(await verifyReplayToken({ ...token, nonce: 'nonce-3' }, { secret: 'server-secret', now: 2000 }, { importNodeCrypto: nullCryptoImport }), { ok: false, status: 'expired' });
  assert.deepEqual(await verifyReplayToken(null, { secret: 'server-secret' }), { ok: false, status: 'invalid_token' });
  await assert.rejects(() => verifyReplayToken(token, { secret: '' }), /server secret/u);

  const generated = await createReplayToken({ secret: 'server-secret', now: 1, ttlMs: 1 }, { crypto: { randomUUID: () => 'uuid-nonce' }, importNodeCrypto: nullCryptoImport });
  assert.equal(generated.nonce, 'uuid-nonce');

  const defaultToken = await createReplayToken({ secret: 'server-secret' }, { importNodeCrypto: nullCryptoImport });
  assert.equal(defaultToken.purpose, 'fingerprint-verification');
  const defaultShapeToken = { ...defaultToken, version: undefined, purpose: undefined };
  assert.deepEqual(await verifyReplayToken(defaultShapeToken, { secret: 'server-secret' }, { importNodeCrypto: nullCryptoImport }), { ok: true, status: 'accepted' });

  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    const fallbackToken = await createReplayToken({ secret: 'server-secret' }, { importNodeCrypto: nullCryptoImport });
    assert.match(fallbackToken.nonce, /^nonce_/u);
  } finally {
    restoreGlobalProperty('crypto', cryptoDescriptor);
  }
});

test('server hash and verifier bind results to backend-only checks', async () => {
  const result = makeResult('client-id', [component('stable', 'ok', 'same', true), component('risk', 'ok', 'report', false)], ['stable']);
  const clientHash = await import('../src/hash-components.js').then((module) => module.hashComponents(result.components, { namespace: 'suite' }, { importNodeCrypto: nullCryptoImport }));
  const signedResult = { ...result, namespace: 'suite', visitorId: clientHash.visitorId };
  const token = await createReplayToken({ secret: 'server-secret', nonce: 'nonce-v', now: 100, ttlMs: 1000 }, { importNodeCrypto: nullCryptoImport });
  const adapter = createStaticNetworkAdapter({ '203.0.113.10': { vpn: true, datacenter: true, asn: 64500, country: 'US' } });

  await assert.rejects(() => createServerHash(signedResult, { secret: '' }), /server secret/u);
  await assert.rejects(() => createServerHash(null, { secret: 'x' }), /IdentifyResult-like/u);
  const serverHash = await createServerHash(signedResult, { secret: 'server-secret', namespace: 'suite' }, { importNodeCrypto: nullCryptoImport });
  assert.equal(serverHash.clientVisitorId, signedResult.visitorId);
  assert.notEqual(serverHash.visitorId, signedResult.visitorId);

  const verified = await verifyFingerprintResult(signedResult, {
    secret: 'server-secret',
    namespace: 'suite',
    replayToken: token,
    replayStore: createMemoryReplayStore(),
    now: 150,
    network: { ip: '203.0.113.10' },
    networkAdapter: adapter,
    generatedAt: '2026-01-01T00:00:00.000Z'
  }, { importNodeCrypto: nullCryptoImport });
  assert.equal(verified.ok, true);
  assert.equal(verified.clientHashMatches, true);
  assert.equal(verified.network.verdict, 'suspicious_network');
  assert.equal(verified.report.generatedAt, '2026-01-01T00:00:00.000Z');

  const mismatch = await verifyFingerprintResult({ ...signedResult, visitorId: 'wrong' }, { namespace: 'suite' }, { importNodeCrypto: nullCryptoImport });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.replay.status, 'not_checked');
  assert.equal(mismatch.serverHash, null);

  const anonymousResult = { ...signedResult, namespace: undefined, visitorId: null };
  const anonymousHash = await createServerHash(anonymousResult, { secret: 'server-secret' }, { importNodeCrypto: nullCryptoImport });
  assert.equal(anonymousHash.namespace, 'default');
  assert.equal(anonymousHash.clientVisitorId, null);
  const anonymousVerify = await verifyFingerprintResult(anonymousResult, {}, { importNodeCrypto: nullCryptoImport });
  assert.equal(anonymousVerify.clientHash.namespace, 'default');
});

test('network risk adapter reports proxy, vpn, tor, datacenter, and unknown networks', async () => {
  const high = await evaluateNetworkRisk({ ip: '1.1.1.1', tor: true, vpn: true, country: 'NL' });
  assert.equal(high.verdict, 'high_risk_network');

  const suspicious = await evaluateNetworkRisk({ ip: '2.2.2.2' }, { adapter: async () => ({ proxy: true, hosting: true }) });
  assert.equal(suspicious.verdict, 'suspicious_network');
  assert.ok(suspicious.evidence.some((item) => item.code === 'datacenter_or_hosting'));

  const adapter = createStaticNetworkAdapter({ '3.3.3.3': { datacenter: true } });
  assert.equal((await evaluateNetworkRisk({ ip: '3.3.3.3' }, { adapter })).score, 0.3);
  assert.equal((await evaluateNetworkRisk({ ip: '4.4.4.4' }, { adapter })).verdict, 'residential_or_unknown');
  assert.equal((await evaluateNetworkRisk(null)).ip, null);
});

function makeResult(visitorId, components, identityComponents) {
  return Object.freeze({
    visitorId,
    requestId: 'req',
    namespace: 'suite',
    createdAt: '2026-01-01T00:00:00.000Z',
    confidence: Object.freeze({ score: 1, level: 'high', entropy: 1, collectedWeight: 1, possibleWeight: 1, platformScore: 1, collectionQuality: { score: 1, level: 'high', collectedWeight: 1, possibleWeight: 1 } }),
    components: Object.freeze(components),
    meta: Object.freeze({ version: '0.1.0', schemaVersion: 'bbid-v2', profile: 'extended', durationMs: 1, hashAlgorithm: 'sha256:test', identityComponents, reportOnlyComponents: components.filter((item) => !identityComponents.includes(item.id) && item.status === 'ok').map((item) => item.id), blocked: false, reason: null, storage: {} })
  });
}

function component(id, status, value, hashable) {
  return Object.freeze({
    id,
    version: '1',
    category: id.startsWith('browser.') || id === 'risk' ? 'risk' : 'custom',
    sensitivity: 'low',
    mode: 'passive',
    stability: hashable ? 'stable' : 'volatile',
    weight: 1,
    hashable,
    status,
    value,
    durationMs: 0,
    error: status === 'ok' ? null : { code: status, message: status }
  });
}

async function nullCryptoImport() {
  throw new Error('no node crypto');
}

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}