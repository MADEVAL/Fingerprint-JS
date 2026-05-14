export type Sensitivity = 'low' | 'medium' | 'high';
export type CollectorMode = 'passive' | 'active';

export interface CollectorContext {
  global: any;
  window: any;
  document: Document | null;
  navigator: Navigator | null;
  screen: Screen | null;
  crypto: Crypto | null;
  consent: unknown;
  now: () => number;
}

export interface CollectorDefinition<T = unknown> {
  id: string;
  version?: string;
  category?: string;
  sensitivity?: Sensitivity;
  mode?: CollectorMode;
  stability?: 'stable' | 'volatile' | string;
  weight?: number;
  collect(context: CollectorContext): T | Promise<T>;
}

export interface Collector<T = unknown> extends Required<Omit<CollectorDefinition<T>, 'collect'>> {
  collect(context: CollectorContext): T | Promise<T>;
}

export function createCollector<T = unknown>(definition: CollectorDefinition<T>): Collector<T>;
export function createDefaultCollectors(): Collector[];
export function createBrowserCollectorPack(): Collector[];
