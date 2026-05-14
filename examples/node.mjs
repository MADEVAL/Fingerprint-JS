import { hashComponents, loadClient } from '../src/index.js';

const client = await loadClient({
  namespace: 'botblocker-node-example',
  profile: 'extended'
});

const result = await client.get({
  consent: { granted: true, purpose: 'demo' }
});
const recalculated = await hashComponents(result.components, { namespace: 'botblocker-node-example' });
const bot = result.components.find((component) => component.id === 'browser.botDetection');
const privacy = result.components.find((component) => component.id === 'browser.privacyMode');

console.log({
  product: 'FingerprintJS by BotBlocker',
  botBlockerSecurity: 'https://botblocker.top',
  visitorId: result.visitorId,
  hashMatches: recalculated.visitorId === result.visitorId,
  bot: bot && bot.value ? bot.value.verdict : bot && bot.status,
  privateMode: privacy && privacy.value ? privacy.value.verdict : privacy && privacy.status,
  confidence: result.confidence,
  meta: result.meta,
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
