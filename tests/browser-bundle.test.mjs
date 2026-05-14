import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const bundlePath = resolve('dist/browser/fingerprint-framework.js');

test('browser bundle exposes global API and identifies in a restricted VM context', {
  skip: existsSync(bundlePath) ? false : 'run npm run build before bundle smoke test'
}, async () => {
  const code = readFileSync(bundlePath, 'utf8');
  const context = vm.createContext({});

  vm.runInContext(code, context);

  assert.equal(typeof context.FingerprintFramework.createClient, 'function');
  assert.equal(typeof context.FingerprintFramework.createBotDetectionCollector, 'function');
  assert.equal(typeof context.FingerprintFramework.loadClient, 'function');
  assert.equal(typeof context.FingerprintFramework.createPrivacyModeCollector, 'function');
  assert.equal(typeof context.FingerprintFramework.hashComponents, 'function');
  assert.equal(typeof context.FingerprintFramework.componentsToDebugString, 'function');

  const collector = context.FingerprintFramework.createCollector({
    id: 'vm.signal',
    sensitivity: 'low',
    collect() {
      return { stable: true };
    }
  });
  const client = context.FingerprintFramework.createClient({
    namespace: 'vm-suite',
    collectors: [collector]
  });

  const result = await client.identify({ consent: { granted: true } });

  assert.ok(result.visitorId);
  assert.equal(result.components[0].status, 'ok');
  assert.equal((await context.FingerprintFramework.hashComponents(result.components, { namespace: 'vm-suite' })).visitorId, result.visitorId);
  assert.match(context.FingerprintFramework.componentsToDebugString(result.components), /vm\.signal/u);
});
