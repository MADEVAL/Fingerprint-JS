import { componentsToDebugString, createClient, createCollector, loadClient, type IdentifyResult } from '@fingerprint-framework/core';
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
  await client.prepare({ consent: { granted: true } });
  const result = await client.get({ consent: { granted: true } });
  componentsToDebugString(result.components);
  return result;
}

async function load(): Promise<void> {
  const loaded = await loadClient({ namespace: 'loaded', loadDelayMs: 0 });
  await loaded.debug({ consent: true });
}

void identify;
void load;
void policy;