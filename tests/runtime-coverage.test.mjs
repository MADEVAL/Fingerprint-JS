import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_PRESETS,
  VERSION,
  canonicalStringify,
  createBrowserCollectorPack,
  createClient,
  createCollector,
  createDefaultCollectors,
  createPolicy,
  hashValue
} from '../src/index.js';
import { createRuntimeContext, hasConsent, waitForRuntimeIdle } from '../src/runtime.js';
import { createMemoryStorage } from '../src/storage-public.js';

test('exports stable metadata and collector packs', () => {
  assert.equal(VERSION, '0.2.0');
  assert.equal(PROFILE_PRESETS.strict.maxSensitivity, 'low');

  const defaultIds = createDefaultCollectors().map((collector) => collector.id);
  const browserIds = createBrowserCollectorPack().map((collector) => collector.id);

  assert.ok(defaultIds.includes('runtime.node'));
  assert.ok(browserIds.includes('runtime.browser'));
  assert.equal(browserIds.includes('runtime.node'), false);
});

test('canonicalStringify handles every supported value category', () => {
  const value = {
    array: [undefined, () => null, Symbol('x'), Number.POSITIVE_INFINITY, 4],
    big: 10n,
    date: new Date('2024-01-02T03:04:05.000Z'),
    invalidDate: new Date('invalid'),
    nested: { z: true, a: false }
  };

  assert.equal(
    canonicalStringify(value),
    '{"array":[null,null,null,null,4],"big":"10","date":"2024-01-02T03:04:05.000Z","invalidDate":null,"nested":{"a":false,"z":true}}'
  );
  assert.equal(canonicalStringify(Symbol('root')), undefined);
});

test('validation rejects invalid options and collector definitions', () => {
  assert.throws(() => createClient({ profile: 'unknown' }), /Unknown privacy profile/u);
  assert.throws(() => createPolicy('unknown'), /Unknown privacy profile/u);
  assert.throws(() => createPolicy('strict', { maxSensitivity: 'secret' }), /Unknown sensitivity/u);
  assert.throws(() => createPolicy('strict', { allowCollectors: 'x' }), /allow\/deny lists/u);
  assert.throws(() => createCollector(null), /must be an object/u);
  assert.throws(() => createCollector({ id: '', collect() {} }), /non-empty string/u);
  assert.throws(() => createCollector({ id: 'missing.collect' }), /must provide collect/u);
  assert.throws(() => createCollector({ id: 'bad.sensitivity', sensitivity: 'secret', collect() {} }), /unknown sensitivity/u);
  assert.throws(() => createClient({ collectors: 'bad' }), /collectors must be an array/u);
  assert.throws(() => createClient({ collectors: [null] }), /must be an object/u);
  assert.throws(() => createClient({ storage: { get() {} } }), /storage must be false/u);
  assert.throws(
    () => createClient({
      collectors: [
        createCollector({ id: 'duplicate', collect: () => 'a' }),
        createCollector({ id: 'duplicate', collect: () => 'b' })
      ]
    }),
    /Duplicate collector id/u
  );
});

test('createCollector normalizes defaults and bounded weight', () => {
  const defaultCollector = createCollector({ id: 'defaulted', collect: () => 'value' });
  const activeCollector = createCollector({
    id: 'active',
    version: 2,
    category: 'graphics',
    sensitivity: 'high',
    mode: 'active',
    stability: 'volatile',
    weight: -10,
    collect: () => 'value'
  });
  const identityAliasCollector = createCollector({ id: 'identity.alias', includeInIdentity: false, collect: () => 'value' });
  const explicitHashableCollector = createCollector({ id: 'identity.explicit', hashable: false, includeInIdentity: true, collect: () => 'value' });

  assert.equal(defaultCollector.version, '1');
  assert.equal(defaultCollector.category, 'custom');
  assert.equal(defaultCollector.mode, 'passive');
  assert.equal(defaultCollector.hashable, true);
  assert.equal(activeCollector.version, '2');
  assert.equal(activeCollector.weight, 0);
  assert.equal(identityAliasCollector.hashable, false);
  assert.equal(explicitHashableCollector.hashable, false);
});

test('components API redacts only successful component values', async () => {
  const client = createClient({
    policy: { redactValues: true },
    collectors: [
      createCollector({ id: 'empty', collect: () => null }),
      createCollector({ id: 'ok', collect: () => ({ visible: true }) })
    ]
  });

  const components = await client.components({ consent: true });

  assert.equal(components.find((component) => component.id === 'empty').status, 'empty');
  assert.equal(components.find((component) => component.id === 'empty').value, null);
  assert.equal(components.find((component) => component.id === 'ok').value, '[redacted]');
});

test('identify handles no components and fallback request ids', async () => {
  const client = createClient({
    collectors: [],
    now: () => Date.UTC(2024, 0, 1)
  });

  const result = await client.identify({
    global: {}
  });

  assert.equal(result.visitorId, null);
  assert.equal(result.createdAt, '2024-01-01T00:00:00.000Z');
  assert.equal(result.confidence.score, 0);
  assert.equal(result.meta.storage.status, 'skipped');
  assert.match(result.requestId, /^req_/u);
});

test('confidence reports medium collection quality for partial collection', async () => {
  const client = createClient({
    collectors: [
      createCollector({ id: 'quality.ok', collect: () => 'ok' }),
      createCollector({ id: 'quality.error', collect: () => { throw new Error('quality_error'); } })
    ]
  });

  const result = await client.identify({ consent: true });

  assert.equal(result.confidence.collectionQuality.score, 0.5);
  assert.equal(result.confidence.collectionQuality.level, 'medium');
});

test('identify uses crypto randomUUID when available', async () => {
  const client = createClient({
    namespace: 'uuid-suite',
    collectors: [createCollector({ id: 'uuid.signal', collect: () => 'x' })]
  });
  const result = await client.identify({
    consent: true,
    global: { crypto: { randomUUID: () => 'fixed-request-id' } }
  });

  assert.equal(result.requestId, 'fixed-request-id');
  assert.equal(result.meta.storage.status, 'disabled');

  const contextCrypto = await client.identify({
    consent: true,
    crypto: { randomUUID: () => 'context-request-id' },
    now: () => Date.UTC(2024, 1, 2)
  });
  assert.equal(contextCrypto.requestId, 'context-request-id');
  assert.equal(contextCrypto.createdAt, '2024-02-02T00:00:00.000Z');
});

test('default client uses built-in collectors', async () => {
  const client = createClient({ namespace: 'default-collectors', profile: 'strict' });
  const components = await client.components({ consent: true, global: { crypto: {} } });

  assert.ok(components.some((component) => component.id === 'runtime.node'));
});

test('policy matrix covers allow, deny, sensitivity, active, and volatile branches', async () => {
  const collectors = [
    createCollector({ id: 'allow.me', category: 'alpha', sensitivity: 'low', collect: () => 'a' }),
    createCollector({ id: 'deny.me', category: 'beta', sensitivity: 'low', collect: () => 'b' }),
    createCollector({ id: 'not.allowed', category: 'alpha', sensitivity: 'low', collect: () => 'n' }),
    createCollector({ id: 'bad.category', category: 'gamma', sensitivity: 'low', collect: () => 'g' }),
    createCollector({ id: 'medium.signal', category: 'alpha', sensitivity: 'medium', collect: () => 'm' }),
    createCollector({ id: 'active.signal', category: 'alpha', sensitivity: 'low', mode: 'active', collect: () => 'active' }),
    createCollector({ id: 'volatile.signal', category: 'alpha', sensitivity: 'low', stability: 'volatile', collect: () => 'volatile' })
  ];

  const denied = await createClient({
    collectors,
    policy: {
      allowCollectors: ['allow.me', 'bad.category', 'medium.signal', 'active.signal', 'volatile.signal'],
      denyCollectors: ['deny.me'],
      allowCategories: ['alpha'],
      maxSensitivity: 'low'
    }
  }).identify({ consent: true });

  assert.equal(denied.components.find((component) => component.id === 'allow.me').status, 'ok');
  assert.equal(denied.components.find((component) => component.id === 'deny.me').status, 'skipped');
  assert.equal(denied.components.find((component) => component.id === 'not.allowed').status, 'skipped');
  assert.equal(denied.components.find((component) => component.id === 'bad.category').status, 'skipped');
  assert.equal(denied.components.find((component) => component.id === 'medium.signal').status, 'skipped');
  assert.equal(denied.components.find((component) => component.id === 'active.signal').status, 'skipped');
  assert.equal(denied.components.find((component) => component.id === 'volatile.signal').status, 'skipped');

  const allowed = await createClient({
    profile: 'balanced',
    collectors,
    policy: {
      maxSensitivity: 'medium',
      includeActive: true,
      includeUnstable: true,
      denyCategories: ['beta']
    }
  }).identify({ consent: true });

  assert.equal(allowed.components.find((component) => component.id === 'active.signal').status, 'ok');
  assert.equal(allowed.components.find((component) => component.id === 'volatile.signal').status, 'ok');
  assert.equal(allowed.components.find((component) => component.id === 'deny.me').status, 'skipped');
});

test('collector errors and timeouts are isolated', async () => {
  const client = createClient({
    collectorTimeoutMs: 1,
    collectors: [
      createCollector({
        id: 'throws.error',
        collect() {
          const error = new Error('broken');
          error.code = 'broken_code';
          throw error;
        }
      }),
      createCollector({
        id: 'throws.string',
        collect() {
          throw 'string failure';
        }
      }),
      createCollector({
        id: 'throws.null',
        collect() {
          throw null;
        }
      }),
      createCollector({
        id: 'timeout.signal',
        collect() {
          return new Promise(() => {});
        }
      })
    ]
  });

  const result = await client.identify({ consent: true });

  assert.equal(result.visitorId, null);
  assert.equal(result.components.find((component) => component.id === 'throws.error').status, 'error');
  assert.equal(result.components.find((component) => component.id === 'throws.error').error.code, 'broken_code');
  assert.equal(result.components.find((component) => component.id === 'throws.string').error.message, 'string failure');
  assert.equal(result.components.find((component) => component.id === 'throws.null').error.code, 'unknown');
  assert.equal(result.components.find((component) => component.id === 'timeout.signal').status, 'timeout');
});

test('collector timeout wrapper is bypassed when timeout is disabled', async () => {
  const client = createClient({
    collectorTimeoutMs: 0,
    collectors: [createCollector({ id: 'async.ok', collect: async () => 'ok' })]
  });

  const result = await client.identify({ consent: true });

  assert.ok(result.visitorId);
  assert.equal(result.components[0].status, 'ok');
});

test('consent can be supplied from client options', async () => {
  const client = createClient({
    consent: { granted: true },
    policy: { requireConsent: true },
    collectors: [createCollector({ id: 'consented', collect: () => 'ok' })]
  });

  const result = await client.identify();

  assert.ok(result.visitorId);
  assert.equal(result.meta.blocked, false);

  const contextConsentClient = createClient({
    policy: { requireConsent: true },
    collectors: [createCollector({ id: 'context.consented', collect: () => 'ok' })]
  });
  const contextConsent = await contextConsentClient.identify({ consent: true });

  assert.ok(contextConsent.visitorId);
});

test('storage handles custom adapters, changed visitors, and adapter errors', async () => {
  const memory = new Map();
  const storage = {
    get: (key) => memory.get(key) || null,
    set: (key, value) => memory.set(key, value)
  };

  const firstClient = createClient({
    namespace: 'custom-storage',
    storage,
    salt: 'a',
    collectors: [createCollector({ id: 'storage.signal', collect: () => 'same' })]
  });
  const secondClient = createClient({
    namespace: 'custom-storage',
    storage,
    salt: 'b',
    collectors: [createCollector({ id: 'storage.signal', collect: () => 'same' })]
  });

  const first = await firstClient.identify({ consent: true });
  const changed = await secondClient.identify({ consent: true });

  assert.equal(first.meta.storage.type, 'custom:custom-storage');
  assert.equal(changed.meta.storage.status, 'created');
  assert.equal(changed.meta.storage.seenCount, 1);

  const brokenClient = createClient({
    namespace: 'broken-storage',
    storage: {
      type: 'broken',
      get() {
        return '{bad json';
      },
      set() {}
    },
    collectors: [createCollector({ id: 'broken.storage.signal', collect: () => 'same' })]
  });
  const broken = await brokenClient.identify({ consent: true });

  assert.equal(broken.meta.storage.status, 'error');
  assert.equal(broken.meta.storage.type, 'broken');
});

test('createMemoryStorage provides a namespaced in-memory adapter', () => {
  const storage = createMemoryStorage({ existing: 'value' });

  assert.equal(storage.type, 'memory');
  assert.equal(storage.get('existing'), 'value');
  assert.equal(storage.get('missing'), null);
  storage.set('next', 'saved');
  assert.equal(storage.get('next'), 'saved');

  const map = new Map([['from-map', 'ok']]);
  assert.equal(createMemoryStorage(map).get('from-map'), 'ok');
  assert.equal(createMemoryStorage().get('empty'), null);
});

test('localStorage adapter is used when available', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  const localStorage = {
    getItem: (key) => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key)
  };

  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

  try {
    const client = createClient({
      namespace: 'local-storage',
      storage: 'local',
      collectors: [createCollector({ id: 'local.storage.signal', collect: () => 'same' })]
    });
    const result = await client.identify({ consent: true });

    assert.equal(result.meta.storage.type, 'localStorage');
    assert.equal(result.meta.storage.status, 'created');
  } finally {
    restoreGlobalProperty('localStorage', previous);
  }
});

test('localStorage adapter is disabled when storage is unavailable', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });

  try {
    const client = createClient({
      namespace: 'local-storage-unavailable',
      storage: 'local',
      collectors: [createCollector({ id: 'local.storage.unavailable', collect: () => 'same' })]
    });
    const result = await client.identify({ consent: true });

    assert.equal(result.meta.storage.enabled, false);
    assert.equal(result.meta.storage.status, 'disabled');
  } finally {
    restoreGlobalProperty('localStorage', previous);
  }
});

test('storage state tolerates legacy entries without seenCount', async () => {
  let stored = null;
  const storage = {
    type: 'legacy-memory',
    get: () => stored,
    set: (_key, value) => { stored = value; }
  };
  const client = createClient({
    namespace: 'legacy-storage',
    storage,
    collectors: [createCollector({ id: 'legacy.storage.signal', collect: () => 'same' })]
  });

  const first = await client.identify({ consent: true });
  const state = JSON.parse(stored);
  stored = JSON.stringify({ visitorId: first.visitorId, firstSeenAt: state.firstSeenAt });
  const second = await client.identify({ consent: true });

  assert.equal(second.meta.storage.status, 'updated');
  assert.equal(second.meta.storage.seenCount, 1);
});

test('default namespace can come from location hostname', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'example.test' } });

  try {
    const client = createClient({
      collectors: [createCollector({ id: 'namespace.signal', collect: () => 'same' })]
    });
    const result = await client.identify({ consent: true });

    assert.equal(result.namespace, 'example.test');
  } finally {
    restoreGlobalProperty('location', previous);
  }
});

test('hashValue supports Web Crypto, Node Crypto, and fallback hashing', async () => {
  const webCrypto = {
    subtle: {
      async digest(algorithm, bytes) {
        assert.equal(algorithm, 'SHA-256');
        assert.ok(bytes instanceof Uint8Array);
        return new Uint8Array([1, 2, 3, 4]).buffer;
      }
    }
  };

  const web = await hashValue('x', { crypto: webCrypto });
  assert.equal(web.algorithm, 'sha256:webcrypto');
  assert.equal(web.value, '01020304');

  const previousCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: null });

  try {
    const node = await hashValue('x');
    assert.equal(node.algorithm, 'sha256:node');
  } finally {
    restoreGlobalProperty('crypto', previousCrypto);
  }

  const fallback = await hashValue('x', {
    crypto: null,
    importNodeCrypto: async () => {
      throw new Error('no crypto');
    }
  });
  assert.equal(fallback.algorithm, 'fnv1a64:fallback');
  assert.match(fallback.value, /^[a-f0-9]{16}$/u);

  const previousTextEncoder = Object.getOwnPropertyDescriptor(globalThis, 'TextEncoder');
  Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: undefined });

  try {
    const noEncoder = await hashValue('abc', {
      crypto: null,
      importNodeCrypto: async () => ({
        createHash(algorithm) {
          assert.equal(algorithm, 'sha256');
          return {
            update(input) {
              assert.equal(input, 'abc');
              return {
                digest(encoding) {
                  assert.equal(encoding, 'hex');
                  return 'abc123';
                }
              };
            }
          };
        }
      })
    });

    assert.equal(noEncoder.value, 'abc123');
  } finally {
    restoreGlobalProperty('TextEncoder', previousTextEncoder);
  }
});

test('duration measurement falls back when performance is unavailable', async () => {
  const previousPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: undefined });

  try {
    const client = createClient({ collectors: [] });
    const result = await client.identify({ global: { crypto: {} } });

    assert.equal(typeof result.meta.durationMs, 'number');
  } finally {
    restoreGlobalProperty('performance', previousPerformance);
  }
});

test('client prepare supports timer and immediate runtime paths', async () => {
  let timerDelay = null;
  const timerClient = createClient({
    loadDelayMs: 7,
    collectors: []
  });

  await timerClient.prepare({
    global: {
      setTimeout(callback, delay) {
        timerDelay = delay;
        callback();
      }
    }
  });
  assert.equal(timerDelay, 7);
  assert.ok(timerClient.preparedAt);

  const immediateClient = createClient({ loadDelayMs: 0, collectors: [] });
  await immediateClient.prepare({ global: {} });
  assert.ok(immediateClient.preparedAt);

  const previousSetTimeout = Object.getOwnPropertyDescriptor(globalThis, 'setTimeout');
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: undefined });
  try {
    const noTimerClient = createClient({ loadDelayMs: 5, collectors: [] });
    await noTimerClient.prepare({ global: {} });
    assert.ok(noTimerClient.preparedAt);
  } finally {
    restoreGlobalProperty('setTimeout', previousSetTimeout);
  }
});

test('runtime context uses explicit values, global fallbacks, and option fallbacks', async () => {
  const optionNow = () => 1;
  const contextNow = () => 2;
  const options = { consent: { granted: true }, now: optionNow };
  const globalRef = {
    window: { name: 'window-from-global' },
    document: { nodeType: 9 },
    navigator: { userAgent: 'global' },
    screen: { width: 1 },
    crypto: { randomUUID: () => 'global-id' }
  };

  const fallback = createRuntimeContext(options, { global: globalRef });
  assert.equal(fallback.window.name, 'window-from-global');
  assert.equal(fallback.document.nodeType, 9);
  assert.equal(fallback.navigator.userAgent, 'global');
  assert.equal(fallback.screen.width, 1);
  assert.equal(fallback.crypto.randomUUID(), 'global-id');
  assert.equal(fallback.consent.granted, true);
  assert.equal(fallback.now(), 1);

  const explicit = createRuntimeContext(options, {
    global: {},
    window: { name: 'explicit-window' },
    document: { nodeType: 10 },
    navigator: { userAgent: 'explicit' },
    screen: { width: 2 },
    crypto: { randomUUID: () => 'explicit-id' },
    consent: false,
    now: contextNow
  });
  assert.equal(explicit.window.name, 'explicit-window');
  assert.equal(explicit.document.nodeType, 10);
  assert.equal(explicit.navigator.userAgent, 'explicit');
  assert.equal(explicit.screen.width, 2);
  assert.equal(explicit.crypto.randomUUID(), 'explicit-id');
  assert.equal(explicit.consent.granted, true);
  assert.equal(explicit.now(), 2);

  let idleTimeout = null;
  await waitForRuntimeIdle({
    requestIdleCallback(callback, optionsArg) {
      idleTimeout = optionsArg.timeout;
      callback();
    }
  }, Number.NaN);
  assert.equal(idleTimeout, 1);

  await waitForRuntimeIdle(undefined, 0);
  assert.equal(hasConsent(true), true);
  assert.equal(hasConsent(null), false);
  assert.equal(hasConsent('yes'), false);
  assert.equal(hasConsent({ granted: true }), true);
  assert.equal(hasConsent({ granted: false }), false);
});

test('collector timeout wrapper is bypassed when timers are unavailable', async () => {
  const previousSetTimeout = Object.getOwnPropertyDescriptor(globalThis, 'setTimeout');
  const previousClearTimeout = Object.getOwnPropertyDescriptor(globalThis, 'clearTimeout');
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, value: undefined });

  try {
    const client = createClient({
      collectorTimeoutMs: 5,
      collectors: [createCollector({ id: 'no.timer.signal', collect: () => 'ok' })]
    });
    const result = await client.identify({ consent: true });

    assert.equal(result.components[0].status, 'ok');
  } finally {
    restoreGlobalProperty('setTimeout', previousSetTimeout);
    restoreGlobalProperty('clearTimeout', previousClearTimeout);
  }
});

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}
