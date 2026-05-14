import { createExplainableReport, createStabilityMonitor, hashComponents, loadClient } from '../src/index.js';
import { createMemoryReplayStore, createReplayToken, verifyFingerprintResult } from '../src/server.js';

const client = await loadClient({
  namespace: 'botblocker-node-example',
  profile: 'extended'
});

const result = await client.get({
  consent: { granted: true, purpose: 'demo' }
});
const recalculated = await hashComponents(result.components, { namespace: 'botblocker-node-example' });
const replayStore = createMemoryReplayStore();
const replayToken = await createReplayToken({ secret: 'demo-secret', purpose: 'node-example' });
const verification = await verifyFingerprintResult(result, {
  secret: 'demo-secret',
  replayToken,
  replayStore,
  network: { ip: '127.0.0.1' }
});
const stability = createStabilityMonitor().observe(result);
const report = createExplainableReport(result, { includeValues: false });
const bot = result.components.find((component) => component.id === 'browser.botDetection');
const privacy = result.components.find((component) => component.id === 'browser.privacyMode');
const tamper = result.components.find((component) => component.id === 'browser.tamperEvidence');

console.log({
  product: 'FingerprintJS by BotBlocker',
  botBlockerSecurity: 'https://botblocker.top',
  visitorId: result.visitorId,
  hashMatches: recalculated.visitorId === result.visitorId,
  serverVerified: verification.ok,
  replay: verification.replay.status,
  network: verification.network.verdict,
  stability,
  bot: bot && bot.value ? bot.value.verdict : bot && bot.status,
  privateMode: privacy && privacy.value ? privacy.value.verdict : privacy && privacy.status,
  tamper: tamper && tamper.value ? tamper.value.verdict : tamper && tamper.status,
  confidence: result.confidence,
  meta: result.meta,
  report: report.summary,
  components: result.components.map((component) => ({
    id: component.id,
    category: component.category,
    status: component.status,
    sensitivity: component.sensitivity,
    mode: component.mode,
    weight: component.weight,
    durationMs: component.durationMs
  }))
});
