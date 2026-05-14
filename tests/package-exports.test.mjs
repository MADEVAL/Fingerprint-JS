import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('package exports are importable from Node after build', {
  skip: existsSync(resolve('dist/index.mjs')) ? false : 'run npm run build before package export smoke test'
}, async () => {
  const core = await import('@fingerprint-framework/core');
  const collectors = await import('@fingerprint-framework/core/collectors');
  const policy = await import('@fingerprint-framework/core/policy');
  const storage = await import('@fingerprint-framework/core/storage');

  assert.equal(typeof core.createClient, 'function');
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