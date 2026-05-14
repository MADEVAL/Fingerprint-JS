export type PrivacyProfile = 'strict' | 'balanced' | 'extended';
export type Sensitivity = 'low' | 'medium' | 'high';
export type CollectorMode = 'passive' | 'active';
export type ComponentStatus = 'ok' | 'empty' | 'error' | 'timeout' | 'skipped';

export interface CollectorContext {
  global: any;
  window: any;
  document: Document | null;
  navigator: Navigator | null;
  screen: Screen | null;
  crypto: Crypto | null;
  consent: boolean | ConsentState | null;
  now: () => number;
}

export interface ConsentState {
  granted: boolean;
  purpose?: string;
  [key: string]: unknown;
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

export interface PolicyOptions {
  requireConsent?: boolean;
  redactValues?: boolean;
  maxSensitivity?: Sensitivity;
  includeActive?: boolean;
  includeUnstable?: boolean;
  allowCollectors?: string[];
  denyCollectors?: string[];
  allowCategories?: string[];
  denyCategories?: string[];
}

export interface StorageAdapter {
  type?: string;
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}

export interface ClientOptions {
  profile?: PrivacyProfile;
  namespace?: string;
  salt?: string;
  collectorTimeoutMs?: number;
  loadDelayMs?: number;
  collectors?: Array<CollectorDefinition | Collector>;
  policy?: PolicyOptions;
  storage?: false | 'local' | StorageAdapter;
  consent?: boolean | ConsentState;
  now?: () => number;
}

export interface IdentifyContext extends Partial<CollectorContext> {
  consent?: boolean | ConsentState;
}

export interface ComponentResult {
  id: string;
  version: string;
  category: string;
  sensitivity: Sensitivity;
  mode: CollectorMode;
  stability: string;
  weight: number;
  status: ComponentStatus;
  value: unknown;
  durationMs: number;
  error: null | { code: string; message: string };
}

export interface ConfidenceResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  entropy: number;
  collectedWeight: number;
  possibleWeight: number;
}

export interface IdentifyResult {
  visitorId: string | null;
  requestId: string;
  namespace: string;
  createdAt: string;
  confidence: ConfidenceResult;
  components: ComponentResult[];
  meta: {
    version: string;
    schemaVersion: string;
    profile: PrivacyProfile;
    durationMs: number;
    hashAlgorithm: string | null;
    blocked: boolean;
    reason: string | null;
    storage: Record<string, unknown>;
  };
}

export interface HashComponentsOptions {
  namespace?: string;
  salt?: string;
}

export interface HashComponentsResult {
  visitorId: string | null;
  hashAlgorithm: string | null;
  namespace: string;
}

export interface FingerprintClient {
  version: string;
  profile: PrivacyProfile;
  collectors: string[];
  readonly preparedAt: string | null;
  prepare(context?: IdentifyContext): Promise<FingerprintClient>;
  get(context?: IdentifyContext): Promise<IdentifyResult>;
  identify(context?: IdentifyContext): Promise<IdentifyResult>;
  components(context?: IdentifyContext): Promise<ComponentResult[]>;
  debug(context?: IdentifyContext): Promise<string>;
}

export const VERSION: string;
export const PROFILE_PRESETS: Record<PrivacyProfile, Record<string, unknown>>;
export function createClient(options?: ClientOptions): FingerprintClient;
export function loadClient(options?: ClientOptions, context?: IdentifyContext): Promise<FingerprintClient>;
export function createCollector<T = unknown, Prepared = unknown>(definition: CollectorDefinition<T, Prepared>): Collector<T, Prepared>;
export function createDefaultCollectors(): Collector[];
export function createBrowserCollectorPack(): Collector[];
export function createPolicy(profile?: PrivacyProfile, overrides?: PolicyOptions): Record<string, unknown>;
export function canonicalStringify(value: unknown): string;
export function componentsToDebugString(components: ComponentResult[]): string;
export function hashComponents(components: ComponentResult[], options?: HashComponentsOptions, context?: IdentifyContext): Promise<HashComponentsResult>;
export function hashValue(value: unknown, runtime?: Partial<CollectorContext>): Promise<{ algorithm: string; value: string }>;
