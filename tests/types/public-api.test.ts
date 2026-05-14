import { componentsToDebugString, createClient, createCollector, hashComponents, loadClient, type IdentifyResult } from '@fingerprint-framework/core';
import { createBrowserCollectorPack, createDefaultCollectors, createNavigatorPropertiesCollector } from '@fingerprint-framework/core/collectors';
import { createPolicy } from '@fingerprint-framework/core/policy';
import { createMemoryStorage } from '@fingerprint-framework/core/storage';

const collector = createCollector({
  id: 'types.signal',
  sensitivity: 'low',
  prepare() {
    return { prepared: true };
  },
  collect(_context, prepared) {
    return { ok: prepared?.prepared === true };
  }
});

const navigatorCollector = createNavigatorPropertiesCollector();

const latencyCollector = createCollector({
  id: 'types.latency',
  sensitivity: 'low',
  collect() {
    return { ok: true };
  }
});

const client = createClient({
  namespace: 'types',
  collectors: [collector, navigatorCollector, latencyCollector, ...createBrowserCollectorPack(), ...createDefaultCollectors()],
  policy: { redactValues: true },
  storage: createMemoryStorage()
});

const policy = createPolicy('balanced', { redactValues: true });

async function identify(): Promise<IdentifyResult> {
  await client.prepare({ consent: { granted: true } });
  const result = await client.get({ consent: { granted: true } });
  componentsToDebugString(result.components);
  await hashComponents(result.components, { namespace: 'types' });
  return result;
}

async function load(): Promise<void> {
  const loaded = await loadClient({ namespace: 'loaded', loadDelayMs: 0 });
  await loaded.debug({ consent: true });
}

void identify;
void load;
void policy;