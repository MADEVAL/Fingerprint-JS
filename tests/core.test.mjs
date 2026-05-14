import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalStringify,
  componentsToDebugString,
  createClient,
  createCollector,
  createPolicy,
  hashComponents,
  hashValue,
  loadClient
} from '../src/index.js';
import { collectComponents } from '../src/components.js';

test('canonicalStringify sorts object keys and removes unsupported values', () => {
  const value = {
    z: 1,
    a: {
      c: Number.NaN,
      b: 'ok',
      skip: undefined
    },
    fn: () => null
  };

  assert.equal(canonicalStringify(value), '{"a":{"b":"ok","c":null},"z":1}');
});

test('hashValue is deterministic', async () => {
  const left = await hashValue('same-input');
  const right = await hashValue('same-input');

  assert.equal(left.value, right.value);
  assert.match(left.value, /^[a-f0-9]{16,64}$/u);
});

test('createPolicy applies balanced defaults', () => {
  const policy = createPolicy('balanced');

  assert.equal(policy.maxSensitivity, 'medium');
  assert.equal(policy.includeActive, false);
});

test('client produces deterministic visitorId for stable custom collectors', async () => {
  const client = createClient({
    namespace: 'suite',
    salt: 'pepper',
    collectors: [
      createCollector({
        id: 'custom.alpha',
        category: 'custom',
        sensitivity: 'low',
        weight: 2,
        collect() {
          return { b: 2, a: 1 };
        }
      }),
      createCollector({
        id: 'custom.beta',
        category: 'custom',
        sensitivity: 'medium',
        collect() {
          return ['x', 'y'];
        }
      })
    ]
  });

  const first = await client.identify({ consent: { granted: true } });
  const second = await client.identify({ consent: { granted: true } });

  assert.equal(first.visitorId, second.visitorId);
  assert.equal(first.confidence.score, 1);
  assert.equal(first.components.filter((component) => component.status === 'ok').length, 2);
});

test('policy skips high sensitivity active collectors in balanced profile', async () => {
  const client = createClient({
    profile: 'balanced',
    collectors: [
      createCollector({
        id: 'safe.signal',
        sensitivity: 'low',
        collect: () => 'safe'
      }),
      createCollector({
        id: 'active.signal',
        sensitivity: 'high',
        mode: 'active',
        collect: () => 'active'
      })
    ]
  });

  const result = await client.identify({ consent: { granted: true } });
  const active = result.components.find((component) => component.id === 'active.signal');

  assert.equal(active.status, 'skipped');
  assert.equal(result.components.find((component) => component.id === 'safe.signal').status, 'ok');
});

test('collectComponents remains available for internal direct collection', async () => {
  const components = await collectComponents([
    createCollector({ id: 'direct.component', collect: () => 'direct' })
  ], createPolicy('extended'), { now: Date.now }, 0);

  assert.equal(components[0].id, 'direct.component');
  assert.equal(components[0].value, 'direct');
});

test('consent gate blocks collection when required consent is missing', async () => {
  const client = createClient({
    policy: { requireConsent: true },
    collectors: [
      createCollector({
        id: 'custom.signal',
        collect: () => 'value'
      })
    ]
  });

  const result = await client.identify();

  assert.equal(result.visitorId, null);
  assert.equal(result.meta.blocked, true);
  assert.equal(result.meta.reason, 'consent_required');
  assert.equal(result.components.length, 0);
});

test('redaction hides component values without breaking visitorId', async () => {
  const client = createClient({
    policy: { redactValues: true },
    collectors: [
      createCollector({
        id: 'custom.secret',
        collect: () => ({ secret: 'visible-before-redaction' })
      })
    ]
  });

  const result = await client.identify({ consent: { granted: true } });

  assert.ok(result.visitorId);
  assert.equal(result.components[0].value, '[redacted]');
});

test('custom storage records repeat visits', async () => {
  const memory = new Map();
  const storage = {
    type: 'memory',
    get: (key) => memory.get(key) || null,
    set: (key, value) => memory.set(key, value)
  };
  const client = createClient({
    namespace: 'storage-suite',
    storage,
    collectors: [
      createCollector({
        id: 'custom.persisted',
        collect: () => 'same'
      })
    ]
  });

  const first = await client.identify({ consent: { granted: true } });
  const second = await client.identify({ consent: { granted: true } });

  assert.equal(first.meta.storage.status, 'created');
  assert.equal(second.meta.storage.status, 'updated');
  assert.equal(second.meta.storage.seenCount, 2);
});

test('loadClient prepares a client and get aliases identify', async () => {
  let idleCalled = false;
  const client = await loadClient({
    namespace: 'load-suite',
    loadDelayMs: 5,
    collectors: [
      createCollector({
        id: 'load.signal',
        collect: () => 'ready'
      })
    ],
    now: () => Date.UTC(2024, 2, 3)
  }, {
    global: {
      requestIdleCallback(callback, options) {
        idleCalled = options.timeout === 10;
        callback();
      }
    }
  });

  assert.equal(idleCalled, true);
  assert.equal(client.preparedAt, '2024-03-03T00:00:00.000Z');

  const result = await client.get({ consent: true });
  assert.ok(result.visitorId);
  assert.equal(result.components[0].id, 'load.signal');
});

test('prepare preloads allowed collectors and active collectors run in declared order', async () => {
  const events = [];
  const client = createClient({
    profile: 'extended',
    collectors: [
      createCollector({
        id: 'passive.slow',
        mode: 'passive',
        prepare: () => {
          events.push('prepare:passive.slow');
          return 'passive-prepared';
        },
        collect: async () => {
          events.push('passive:start');
          await Promise.resolve();
          events.push('passive:end');
          return 'passive';
        }
      }),
      createCollector({
        id: 'active.prepared',
        mode: 'active',
        sensitivity: 'low',
        prepare: () => {
          events.push('prepare:active.prepared');
          return 'prepared-value';
        },
        collect: (_context, prepared) => {
          events.push(`collect:active.prepared:${prepared}`);
          return prepared;
        }
      }),
      createCollector({
        id: 'active.second',
        mode: 'active',
        sensitivity: 'low',
        collect: () => {
          events.push('collect:active.second');
          return 'second';
        }
      })
    ]
  });

  await client.prepare({ consent: true });
  const result = await client.identify({ consent: true });

  assert.deepEqual(events, [
    'prepare:passive.slow',
    'prepare:active.prepared',
    'passive:start',
    'passive:end',
    'collect:active.prepared:prepared-value',
    'collect:active.second'
  ]);
  assert.equal(result.components.find((component) => component.id === 'active.prepared').value, 'prepared-value');
});

test('prepare respects consent requirements and falls back when preparation fails', async () => {
  let prepared = 0;
  const client = createClient({
    profile: 'extended',
    policy: { requireConsent: true },
    collectors: [
      createCollector({
        id: 'prepare.private',
        mode: 'active',
        sensitivity: 'low',
        prepare: () => {
          prepared += 1;
          throw new Error('prepare failed');
        },
        collect: (_context, value) => value || 'fallback'
      })
    ]
  });

  await client.prepare();
  assert.equal(prepared, 0);

  await client.prepare({ consent: true });
  const result = await client.identify({ consent: true });

  assert.equal(prepared, 1);
  assert.equal(result.components[0].value, 'fallback');
});

test('hashComponents recalculates visitorId from component results', async () => {
  const client = createClient({
    namespace: 'hash-suite',
    salt: 'salt',
    collectors: [
      createCollector({ id: 'hash.a', collect: () => 'a' }),
      createCollector({ id: 'hash.b', collect: () => 'b' })
    ]
  });

  const result = await client.identify({ consent: true });
  const hashed = await hashComponents(result.components, { namespace: 'hash-suite', salt: 'salt' });
  const changed = await hashComponents(result.components.filter((component) => component.id !== 'hash.b'), { namespace: 'hash-suite', salt: 'salt' });
  const defaulted = await hashComponents([null, ...result.components]);
  const empty = await hashComponents([], { namespace: 'hash-suite' });

  assert.equal(hashed.visitorId, result.visitorId);
  assert.notEqual(changed.visitorId, result.visitorId);
  assert.equal(defaulted.namespace, 'default');
  assert.ok(defaulted.visitorId);
  assert.equal(empty.visitorId, null);
  await assert.rejects(() => hashComponents(null), /components must be an array/u);
});

test('debug output formats component values and errors', async () => {
  assert.throws(() => componentsToDebugString(null), /components must be an array/u);

  const client = createClient({
    collectors: [
      createCollector({ id: 'debug.ok', collect: () => ({ value: true }) }),
      createCollector({ id: 'debug.error', collect: () => { throw new Error('debug failure'); } })
    ]
  });

  const debug = await client.debug({ consent: true });
  assert.match(debug, /debug\.ok \[ok\] \{"value":true\}/u);
  assert.match(debug, /debug\.error \[error\]/u);
});
