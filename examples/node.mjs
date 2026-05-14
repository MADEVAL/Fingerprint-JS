import { createClient } from '../src/index.js';

const client = createClient({
  namespace: 'node-example',
  profile: 'balanced'
});

const result = await client.identify({
  consent: { granted: true, purpose: 'demo' }
});

console.log({
  visitorId: result.visitorId,
  confidence: result.confidence,
  components: result.components.map((component) => ({ id: component.id, status: component.status }))
});
