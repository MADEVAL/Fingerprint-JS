import { componentsToDebugString, createApiFeaturesCollector, createBotDetectionCollector, createClient, createCollector, createCssFeaturesCollector, createNetworkConnectionCollector, createPerformanceMemoryCollector, createPrivacyModeCollector, createWebglPrecisionCollector, hashComponents, loadClient, type IdentifyResult } from '@botblocker/fingerprintjs';
import { createBrowserCollectorPack, createDefaultCollectors, createNavigatorPropertiesCollector } from '@botblocker/fingerprintjs/collectors';
import { createPolicy } from '@botblocker/fingerprintjs/policy';
import { createMemoryStorage } from '@botblocker/fingerprintjs/storage';

const collector = createCollector({
  id: 'types.signal',
  sensitivity: 'low',
  includeInIdentity: true,
  prepare() {
    return { prepared: true };
  },
  collect(_context, prepared) {
    return { ok: prepared?.prepared === true };
  }
});

const navigatorCollector = createNavigatorPropertiesCollector();
const botCollector = createBotDetectionCollector();
const privacyCollector = createPrivacyModeCollector();
const apiCollector = createApiFeaturesCollector();
const cssCollector = createCssFeaturesCollector();
const networkCollector = createNetworkConnectionCollector();
const memoryCollector = createPerformanceMemoryCollector();
const precisionCollector = createWebglPrecisionCollector();

const latencyCollector = createCollector({
  id: 'types.latency',
  sensitivity: 'low',
  hashable: false,
  collect() {
    return { ok: true };
  }
});

const client = createClient({
  namespace: 'types',
  collectors: [collector, navigatorCollector, botCollector, privacyCollector, apiCollector, cssCollector, networkCollector, memoryCollector, precisionCollector, latencyCollector, ...createBrowserCollectorPack(), ...createDefaultCollectors()],
  policy: { redactValues: true },
  identity: { denyCollectors: ['types.latency'], includeNonHashable: false },
  storage: createMemoryStorage()
});

const policy = createPolicy('balanced', { redactValues: true });

async function identify(): Promise<IdentifyResult> {
  await client.prepare({ consent: { granted: true } });
  const result = await client.get({ consent: { granted: true } });
  componentsToDebugString(result.components);
  await hashComponents(result.components, { namespace: 'types', includeNonHashable: true, denyCollectors: ['types.latency'] });
  result.meta.identityComponents.join(',');
  result.meta.reportOnlyComponents.join(',');
  result.confidence.collectionQuality.score.toFixed(2);
  return result;
}

async function load(): Promise<void> {
  const loaded = await loadClient({ namespace: 'loaded', loadDelayMs: 0 });
  await loaded.debug({ consent: true });
}

void identify;
void load;
void policy;