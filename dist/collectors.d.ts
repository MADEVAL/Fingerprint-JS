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

export interface CollectorDefinition<T = unknown, Prepared = unknown> {
  id: string;
  version?: string;
  category?: string;
  sensitivity?: Sensitivity;
  mode?: CollectorMode;
  stability?: 'stable' | 'volatile' | string;
  weight?: number;
  prepare?(context: CollectorContext): Prepared | Promise<Prepared>;
  collect(context: CollectorContext, prepared?: Prepared): T | Promise<T>;
}

export interface Collector<T = unknown, Prepared = unknown> {
  id: string;
  version: string;
  category: string;
  sensitivity: Sensitivity;
  mode: CollectorMode;
  stability: string;
  weight: number;
  prepare: null | ((context: CollectorContext) => Prepared | Promise<Prepared>);
  collect(context: CollectorContext, prepared?: Prepared): T | Promise<T>;
}

export function createCollector<T = unknown, Prepared = unknown>(definition: CollectorDefinition<T, Prepared>): Collector<T, Prepared>;
export function createBotDetectionCollector(): Collector;
export function createDefaultCollectors(): Collector[];
export function createBrowserCollectorPack(): Collector[];
export function createNavigatorPropertiesCollector(): Collector;
export function createPrivacyModeCollector(): Collector;
