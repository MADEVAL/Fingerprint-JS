import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalStringify,
  createClient,
  createCollector,
  createPolicy,
  hashValue
} from '../src/index.js';

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
