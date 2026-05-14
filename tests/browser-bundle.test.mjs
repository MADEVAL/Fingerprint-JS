import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const bundlePath = resolve('dist/browser/fingerprintjs-botblocker.js');

test('browser bundle exposes global API and identifies in a restricted VM context', {
  skip: existsSync(bundlePath) ? false : 'run npm run build before bundle smoke test'
}, async () => {
  const code = readFileSync(bundlePath, 'utf8');
  const context = vm.createContext({});

  vm.runInContext(code, context);

  assert.equal(typeof context.FingerprintJSBotBlocker.createClient, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createApiFeaturesCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createBotDetectionCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createCssFeaturesCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.loadClient, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createNetworkConnectionCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createPerformanceMemoryCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createPrivacyModeCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.createWebglPrecisionCollector, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.hashComponents, 'function');
  assert.equal(typeof context.FingerprintJSBotBlocker.componentsToDebugString, 'function');

  const collector = context.FingerprintJSBotBlocker.createCollector({
    id: 'vm.signal',
    sensitivity: 'low',
    collect() {
      return { stable: true };
    }
  });
  const client = context.FingerprintJSBotBlocker.createClient({
    namespace: 'vm-suite',
    collectors: [collector]
  });

  const result = await client.identify({ consent: { granted: true } });

  assert.ok(result.visitorId);
  assert.equal(result.components[0].status, 'ok');
  assert.equal((await context.FingerprintJSBotBlocker.hashComponents(result.components, { namespace: 'vm-suite' })).visitorId, result.visitorId);
  assert.match(context.FingerprintJSBotBlocker.componentsToDebugString(result.components), /vm\.signal/u);
});
