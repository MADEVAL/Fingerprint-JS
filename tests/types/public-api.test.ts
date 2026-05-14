import { createClient, createCollector, type IdentifyResult } from '@fingerprint-framework/core';
import { createBrowserCollectorPack, createDefaultCollectors } from '@fingerprint-framework/core/collectors';
import { createPolicy } from '@fingerprint-framework/core/policy';
import { createMemoryStorage } from '@fingerprint-framework/core/storage';

const collector = createCollector({
  id: 'types.signal',
  sensitivity: 'low',
  collect() {
    return { ok: true };
  }
});

const client = createClient({
  namespace: 'types',
  collectors: [collector, ...createBrowserCollectorPack(), ...createDefaultCollectors()],
  policy: { redactValues: true },
  storage: createMemoryStorage()
});

const policy = createPolicy('balanced', { redactValues: true });

async function identify(): Promise<IdentifyResult> {
  return client.identify({ consent: { granted: true } });
}

void identify;
void policy;