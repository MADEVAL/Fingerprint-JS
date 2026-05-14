import { componentsToDebugString, createAnalysisReport, createApiFeaturesCollector, createBotDetectionCollector, createClient, createCollector, createCssFeaturesCollector, createExplainableReport, createNetworkConnectionCollector, createPerformanceMemoryCollector, createPrivacyModeCollector, createStabilityMonitor, createTamperEvidenceCollector, createUseCasePreset, createWebglPrecisionCollector, hashComponents, listUseCasePresets, loadClient, type IdentifyResult } from '@botblocker/fingerprintjs';
import { createBrowserCollectorPack, createDefaultCollectors, createNavigatorPropertiesCollector } from '@botblocker/fingerprintjs/collectors';
import { createPolicy } from '@botblocker/fingerprintjs/policy';
import { createMemoryReplayStore, createReplayToken, createServerHash, createStaticNetworkAdapter, evaluateNetworkRisk, verifyFingerprintResult } from '@botblocker/fingerprintjs/server';
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
const tamperCollector = createTamperEvidenceCollector();
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
  useCase: 'bot-defense',
  collectors: [collector, navigatorCollector, botCollector, privacyCollector, tamperCollector, apiCollector, cssCollector, networkCollector, memoryCollector, precisionCollector, latencyCollector, ...createBrowserCollectorPack(), ...createDefaultCollectors()],
  policy: { redactValues: true },
  identity: { denyCollectors: ['types.latency'], includeNonHashable: false },
  storage: createMemoryStorage()
});

const policy = createPolicy('balanced', { redactValues: true });
const preset = createUseCasePreset('login-risk');
const presets = listUseCasePresets();
const monitor = createStabilityMonitor({ historyLimit: 5 });

async function identify(): Promise<IdentifyResult> {
  await client.prepare({ consent: { granted: true } });
  const result = await client.get({ consent: { granted: true } });
  componentsToDebugString(result.components);
  const allSignalsHash = await hashComponents(result.components, { namespace: 'types', includeNonHashable: true, denyCollectors: ['types.latency'] });
  result.meta.identityComponents.join(',');
  result.meta.reportOnlyComponents.join(',');
  result.confidence.collectionQuality.score.toFixed(2);
  createAnalysisReport(result, { allSignalsHash });
  createExplainableReport(result, { includeValues: false });
  monitor.observe(result);
  const token = await createReplayToken({ secret: 'secret', nonce: 'nonce' });
  const serverHash = await createServerHash(result, { secret: 'secret' });
  const verified = await verifyFingerprintResult(result, { secret: 'secret', replayToken: token, replayStore: createMemoryReplayStore(), network: { ip: '127.0.0.1' }, networkAdapter: createStaticNetworkAdapter({}) });
  await evaluateNetworkRisk({ ip: '127.0.0.1', proxy: true });
  void serverHash;
  void verified;
  return result;
}

async function load(): Promise<void> {
  const loaded = await loadClient({ namespace: 'loaded', loadDelayMs: 0 });
  await loaded.debug({ consent: true });
}

void identify;
void load;
void policy;
void preset;
void presets;