import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('package exports are importable from Node after build', {
  skip: existsSync(resolve('dist/index.mjs')) ? false : 'run npm run build before package export smoke test'
}, async () => {
  const core = await import('@botblocker/fingerprintjs');
  const collectors = await import('@botblocker/fingerprintjs/collectors');
  const policy = await import('@botblocker/fingerprintjs/policy');
  const storage = await import('@botblocker/fingerprintjs/storage');

  assert.equal(typeof core.createClient, 'function');
  assert.equal(typeof core.createApiFeaturesCollector, 'function');
  assert.equal(typeof core.createCssFeaturesCollector, 'function');
  assert.equal(typeof core.createNetworkConnectionCollector, 'function');
  assert.equal(typeof core.createPerformanceMemoryCollector, 'function');
  assert.equal(typeof core.createWebglPrecisionCollector, 'function');
  assert.equal(typeof collectors.createDefaultCollectors, 'function');
  assert.equal(typeof policy.createPolicy, 'function');
  assert.equal(typeof storage.createMemoryStorage, 'function');

  const client = core.createClient({
    namespace: 'package-smoke',
    collectors: [collectors.createCollector({ id: 'package.signal', collect: () => 'ok' })],
    storage: storage.createMemoryStorage()
  });
  const result = await client.identify({ consent: true });

  assert.ok(result.visitorId);
});