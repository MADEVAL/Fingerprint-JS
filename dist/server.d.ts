import type { HashComponentsResult, IdentifyResult } from './index.d.ts';

export interface ReplayToken {
  version: string;
  nonce: string;
  purpose: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
  algorithm: string;
}

export interface ReplayStore {
  has(nonce: string, now?: number): boolean | Promise<boolean>;
  set(nonce: string, expiresAt: number): void | Promise<void>;
  size?(now?: number): number;
}

export interface NetworkRiskSubject {
  ip?: string;
  asn?: string | number;
  country?: string;
  vpn?: boolean;
  proxy?: boolean;
  tor?: boolean;
  datacenter?: boolean;
  hosting?: boolean;
  [key: string]: unknown;
}

export interface NetworkRiskResult {
  verdict: 'high_risk_network' | 'suspicious_network' | 'residential_or_unknown';
  score: number;
  ip: string | null;
  asn: string | number | null;
  country: string | null;
  evidence: Array<{ code: string; weight: number }>;
}

export interface NetworkAdapter {
  lookup(subject: NetworkRiskSubject): NetworkRiskSubject | null | Promise<NetworkRiskSubject | null>;
}

export function createMemoryReplayStore(): ReplayStore;
export function createReplayToken(options: { secret: string; nonce?: string; purpose?: string; now?: number; ttlMs?: number }, context?: Record<string, unknown>): Promise<ReplayToken>;
export function verifyReplayToken(token: ReplayToken | unknown, options: { secret: string; store?: ReplayStore; now?: number }, context?: Record<string, unknown>): Promise<{ ok: boolean; status: string }>;
export function createServerHash(result: IdentifyResult, options: { secret: string; namespace?: string; salt?: string; includeNonHashable?: boolean; allowCollectors?: string[]; denyCollectors?: string[] }, context?: Record<string, unknown>): Promise<{ mode: 'server_hash'; visitorId: string | null; clientVisitorId: string | null; namespace: string; hashAlgorithm: string | null }>;
export function verifyFingerprintResult(result: IdentifyResult, options?: { namespace?: string; clientSalt?: string; secret?: string; replaySecret?: string; replayToken?: ReplayToken; replayStore?: ReplayStore; now?: number; generatedAt?: string; network?: NetworkRiskSubject; networkAdapter?: NetworkAdapter | ((subject: NetworkRiskSubject) => NetworkRiskSubject | null | Promise<NetworkRiskSubject | null>) }, context?: Record<string, unknown>): Promise<{ ok: boolean; clientHashMatches: boolean; clientHash: HashComponentsResult; serverHash: unknown; replay: { ok: boolean; status: string }; network: NetworkRiskResult | null; report: Record<string, unknown> }>;
export function createStaticNetworkAdapter(records?: Record<string, NetworkRiskSubject>): NetworkAdapter;
export function evaluateNetworkRisk(subject?: NetworkRiskSubject, options?: { adapter?: NetworkAdapter | ((subject: NetworkRiskSubject) => NetworkRiskSubject | null | Promise<NetworkRiskSubject | null>) }): Promise<NetworkRiskResult>;