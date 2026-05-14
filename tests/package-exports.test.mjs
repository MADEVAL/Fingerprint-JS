import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

test('package exports are importable from Node after build', {
  skip: existsSync(resolve('dist/index.mjs')) && existsSync(resolve('dist/server.mjs')) ? false : 'run npm run build before package export smoke test'
}, async () => {
  const core = await import('@botblocker/fingerprintjs');
  const collectors = await import('@botblocker/fingerprintjs/collectors');
  const policy = await import('@botblocker/fingerprintjs/policy');
  const server = await import('@botblocker/fingerprintjs/server');
  const storage = await import('@botblocker/fingerprintjs/storage');
  const require = createRequire(import.meta.url);
  const cjs = require('@botblocker/fingerprintjs');
  const cjsServer = require('@botblocker/fingerprintjs/server');

  assert.equal(typeof core.createClient, 'function');
  assert.equal(typeof cjs.createClient, 'function');
  assert.equal(typeof core.createExplainableReport, 'function');
  assert.equal(typeof core.createStabilityMonitor, 'function');
  assert.equal(typeof core.createUseCasePreset, 'function');
  assert.equal(typeof core.createApiFeaturesCollector, 'function');
  assert.equal(typeof core.createCssFeaturesCollector, 'function');
  assert.equal(typeof core.createNetworkConnectionCollector, 'function');
  assert.equal(typeof core.createPerformanceMemoryCollector, 'function');
  assert.equal(typeof core.createWebglPrecisionCollector, 'function');
  assert.equal(typeof collectors.createDefaultCollectors, 'function');
  assert.equal(typeof collectors.createTamperEvidenceCollector, 'function');
  assert.equal(typeof policy.createPolicy, 'function');
  assert.equal(typeof server.verifyFingerprintResult, 'function');
  assert.equal(typeof cjsServer.createServerHash, 'function');
  assert.equal(typeof storage.createMemoryStorage, 'function');

  const client = core.createClient({
    namespace: 'package-smoke',
    collectors: [collectors.createCollector({ id: 'package.signal', collect: () => 'ok' })],
    storage: storage.createMemoryStorage()
  });
  const result = await client.identify({ consent: true });

  assert.ok(result.visitorId);
  assert.deepEqual(result.meta.identityComponents, ['package.signal']);
});